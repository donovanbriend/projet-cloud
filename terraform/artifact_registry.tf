resource "google_artifact_registry_repository" "notula" {
  provider = google-beta

  location      = var.region
  repository_id = "notula"
  description   = "Docker images for Notula"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

locals {
  registry = "${var.region}-docker.pkg.dev/${var.project_id}/notula"
}
