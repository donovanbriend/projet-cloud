# ── Plage d'IPs privées pour Cloud SQL ──────────────────────────
# Réserve un bloc /16 dans le VPC default pour le peering avec les services Google
resource "google_compute_global_address" "private_ip_range" {
  name          = "notula-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = "default"

  depends_on = [google_project_service.apis]
}

# Établit la connexion de peering entre le VPC default et les services Google
# (nécessaire pour que Cloud SQL obtienne une IP privée)
resource "google_service_networking_connection" "private_vpc" {
  network                 = "projects/${var.project_id}/global/networks/default"
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]

  depends_on = [google_project_service.apis]
}

# ── VPC Serverless Connector ─────────────────────────────────────
# Permet aux services Cloud Run d'atteindre Cloud SQL via le réseau privé
resource "google_vpc_access_connector" "connector" {
  name          = "notula-connector"
  region        = var.region
  network       = "default"
  ip_cidr_range = "10.8.0.0/28"
  min_instances = 2
  max_instances = 3

  depends_on = [google_project_service.apis]
}
