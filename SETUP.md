# Setup Guide

## 1. Prérequis

- Compte GCP avec un projet créé
- `gcloud` CLI installé et configuré
- `terraform` >= 1.7 installé
- `docker` installé

## 2. Créer le Service Account GCP pour GitHub Actions

```bash
export PROJECT_ID="ton-projet-id"

# Créer le SA
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions" \
  --project=$PROJECT_ID

# Lui donner les droits nécessaires
for role in \
  roles/run.admin \
  roles/artifactregistry.admin \
  roles/iam.serviceAccountUser \
  roles/storage.admin; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role"
done

# Générer la clé JSON
gcloud iam service-accounts keys create gcp-sa-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
```

## 3. Configurer les secrets GitHub

Dans ton repo → Settings → Secrets and variables → Actions :

| Secret | Valeur |
|--------|--------|
| `GCP_PROJECT_ID` | ton project ID GCP |
| `GCP_SA_KEY` | contenu du fichier `gcp-sa-key.json` |
| `AUTH_SERVICE_URL` | URL Cloud Run auth (après premier `terraform apply`) |
| `NOTES_SERVICE_URL` | URL Cloud Run notes (après premier `terraform apply`) |

## 4. Premier déploiement avec Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Éditer terraform.tfvars avec tes valeurs

terraform init
terraform plan
terraform apply
```

## 5. Mettre à jour les secrets GitHub avec les URLs

Après `terraform apply`, récupère les outputs :

```bash
terraform output frontend_url
terraform output auth_service_url
terraform output notes_service_url
```

Mets à jour `AUTH_SERVICE_URL` et `NOTES_SERVICE_URL` dans les secrets GitHub.

## 6. Déployer via CI/CD

```bash
git add .
git commit -m "initial deploy"
git push origin main
```

Le pipeline GitHub Actions va :
1. Builder les 3 images Docker
2. Les pousser sur Artifact Registry
3. Déployer sur Cloud Run
