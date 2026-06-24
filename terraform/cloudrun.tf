locals {
  db_url = "postgresql+asyncpg://notes_user:${var.db_password}@${google_sql_database_instance.notula.private_ip_address}:5432/notes_db"
}

# ── Auth Service ────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "auth" {
  name     = "notula-auth"
  location = var.region

  template {
    service_account = google_service_account.backend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${local.registry}/auth-service:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true # Scale to zero — CPU alloué seulement pendant les requêtes
      }

      env {
        name  = "DATABASE_URL"
        value = local.db_url
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 10
        period_seconds        = 30
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.connector,
    google_sql_database_instance.notula,
  ]
}

# ── Notes Service ───────────────────────────────────────────────
resource "google_cloud_run_v2_service" "notes" {
  name     = "notula-notes"
  location = var.region

  template {
    service_account = google_service_account.backend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${local.registry}/notes-service:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }

      env {
        name  = "DATABASE_URL"
        value = local.db_url
      }

      env {
        name  = "AUTH_SERVICE_URL"
        value = google_cloud_run_v2_service.auth.uri
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 10
        period_seconds        = 30
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.connector,
    google_sql_database_instance.notula,
    google_cloud_run_v2_service.auth,
  ]
}

# ── Frontend ────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "frontend" {
  name     = "notula-frontend"
  location = var.region

  template {
    service_account = google_service_account.frontend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = "${local.registry}/frontend:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
        cpu_idle = true
      }
    }
  }

  depends_on = [google_project_service.apis]
}
