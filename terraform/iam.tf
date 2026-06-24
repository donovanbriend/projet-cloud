# Service account partagé par les deux microservices backend
resource "google_service_account" "backend" {
  account_id   = "notula-backend"
  display_name = "Notula Backend Services"
}

# Accès aux secrets
resource "google_secret_manager_secret_iam_member" "backend_jwt" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_secret_manager_secret_iam_member" "backend_db" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

# Accès Cloud SQL
resource "google_project_iam_member" "backend_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# Service account pour le frontend (lecture seule — pas besoin de secrets)
resource "google_service_account" "frontend" {
  account_id   = "notula-frontend"
  display_name = "Notula Frontend"
}

# Autorise les appels publics (non authentifiés) vers les Cloud Run
resource "google_cloud_run_v2_service_iam_member" "auth_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.auth.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "notes_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.notes.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
