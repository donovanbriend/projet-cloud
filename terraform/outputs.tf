output "frontend_url" {
  description = "URL publique du frontend"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "auth_service_url" {
  description = "URL publique de l'auth service"
  value       = google_cloud_run_v2_service.auth.uri
}

output "notes_service_url" {
  description = "URL publique du notes service"
  value       = google_cloud_run_v2_service.notes.uri
}

output "artifact_registry" {
  description = "Chemin du registre Docker"
  value       = local.registry
}

output "db_instance_name" {
  description = "Nom de l'instance Cloud SQL"
  value       = google_sql_database_instance.notula.name
}

output "monitoring_dashboard" {
  description = "URL du dashboard Cloud Monitoring"
  value       = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.notula.id}?project=${var.project_id}"
}
