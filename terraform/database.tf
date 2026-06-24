resource "google_sql_database_instance" "notula" {
  name             = "notula-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-f1-micro" # Minimal pour le projet
    availability_type = "ZONAL"
    disk_size         = 10
    disk_autoresize   = false

    backup_configuration {
      enabled = false # Désactivé pour réduire les coûts en dev
    }

    ip_configuration {
      ipv4_enabled    = false # Pas d'IP publique — connexion via VPC uniquement
      private_network = "projects/${var.project_id}/global/networks/default"
    }
  }

  deletion_protection = false

  depends_on = [
    google_project_service.apis,
    google_service_networking_connection.private_vpc,
  ]
}

resource "google_sql_database" "notula" {
  name     = "notes_db"
  instance = google_sql_database_instance.notula.name
}

resource "google_sql_user" "app" {
  name     = "notes_user"
  instance = google_sql_database_instance.notula.name
  password = var.db_password
}
