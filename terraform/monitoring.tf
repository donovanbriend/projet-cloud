# ── Canal de notification email ─────────────────────────────────
variable "alert_email" {
  description = "Email pour recevoir les alertes"
  type        = string
  default     = "donobrd@gmail.com"
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Notula Alerts"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }

  depends_on = [google_project_service.apis]
}

# ── Uptime checks (disponibilité) ───────────────────────────────
resource "google_monitoring_uptime_check_config" "auth_health" {
  display_name = "Auth Service - Health"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = trimprefix(google_cloud_run_v2_service.auth.uri, "https://")
    }
  }

  depends_on = [google_cloud_run_v2_service.auth]
}

resource "google_monitoring_uptime_check_config" "notes_health" {
  display_name = "Notes Service - Health"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = trimprefix(google_cloud_run_v2_service.notes.uri, "https://")
    }
  }

  depends_on = [google_cloud_run_v2_service.notes]
}

resource "google_monitoring_uptime_check_config" "frontend_health" {
  display_name = "Frontend - Health"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = trimprefix(google_cloud_run_v2_service.frontend.uri, "https://")
    }
  }

  depends_on = [google_cloud_run_v2_service.frontend]
}

# ── Alerte : service indisponible ───────────────────────────────
resource "google_monitoring_alert_policy" "uptime_failure" {
  display_name = "Service indisponible"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failure"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\""
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = "60s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_TRUE"
        group_by_fields      = ["resource.labels.host"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  depends_on = [
    google_monitoring_uptime_check_config.auth_health,
    google_monitoring_uptime_check_config.notes_health,
    google_monitoring_uptime_check_config.frontend_health,
  ]
}

# ── Alerte : taux d'erreurs HTTP 5xx élevé ──────────────────────
resource "google_monitoring_alert_policy" "error_rate" {
  display_name = "Taux d'erreurs 5xx élevé"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run request error rate > 5%"
    condition_threshold {
      filter = join(" AND ", [
        "metric.type=\"run.googleapis.com/request_count\"",
        "resource.type=\"cloud_run_revision\"",
        "metric.labels.response_code_class=\"5xx\"",
      ])
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "120s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.labels.service_name"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  depends_on = [google_project_service.apis]
}

# ── Alerte : latence P95 > 2s ───────────────────────────────────
resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "Latence P95 > 2s"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run P95 latency > 2000ms"
    condition_threshold {
      filter = join(" AND ", [
        "metric.type=\"run.googleapis.com/request_latencies\"",
        "resource.type=\"cloud_run_revision\"",
      ])
      comparison      = "COMPARISON_GT"
      threshold_value = 2000
      duration        = "120s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.labels.service_name"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  depends_on = [google_project_service.apis]
}

# ── Dashboard Cloud Monitoring ───────────────────────────────────
resource "google_monitoring_dashboard" "notula" {
  dashboard_json = jsonencode({
    displayName = "Notula - Overview"
    gridLayout = {
      columns = 2
      widgets = [
        {
          title = "Requêtes par service (req/s)"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["resource.labels.service_name"]
                  }
                }
              }
              plotType = "LINE"
            }]
          }
        },
        {
          title = "Latence P95 par service (ms)"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_PERCENTILE_95"
                    crossSeriesReducer = "REDUCE_MEAN"
                    groupByFields      = ["resource.labels.service_name"]
                  }
                }
              }
              plotType = "LINE"
            }]
          }
        },
        {
          title = "Erreurs 5xx par service"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND metric.labels.response_code_class=\"5xx\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["resource.labels.service_name"]
                  }
                }
              }
              plotType = "LINE"
            }]
          }
        },
        {
          title = "Nombre d'instances actives"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/container/instance_count\" AND resource.type=\"cloud_run_revision\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["resource.labels.service_name"]
                  }
                }
              }
              plotType = "LINE"
            }]
          }
        },
        {
          title = "Uptime checks"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_FRACTION_TRUE"
                    crossSeriesReducer = "REDUCE_MEAN"
                    groupByFields      = ["resource.labels.host"]
                  }
                }
              }
              plotType = "LINE"
            }]
          }
        },
        {
          title = "Utilisation CPU Cloud SQL"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\" AND resource.type=\"cloudsql_database\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
              plotType = "LINE"
            }]
          }
        },
      ]
    }
  })

  depends_on = [google_project_service.apis]
}
