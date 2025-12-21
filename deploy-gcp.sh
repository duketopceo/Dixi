# GCP Cloud Run Deployment Script
# This script automates the deployment of Dixi services to Google Cloud Platform

PROJECT_ID="your-gcp-project-id"
REGION="us-central1"

# Build and push Docker images
echo "Building backend..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/dixi-backend packages/backend

echo "Building frontend..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/dixi-frontend packages/frontend

echo "Building vision service..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/dixi-vision packages/vision

# Deploy services
echo "Deploying backend..."
gcloud run deploy dixi-backend \
  --image gcr.io/$PROJECT_ID/dixi-backend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2

echo "Deploying frontend..."
gcloud run deploy dixi-frontend \
  --image gcr.io/$PROJECT_ID/dixi-frontend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1

echo "Deploying vision service..."
gcloud run deploy dixi-vision \
  --image gcr.io/$PROJECT_ID/dixi-vision \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2

echo "Deployment complete!"
echo "Backend URL: $(gcloud run services describe dixi-backend --region $REGION --format 'value(status.url)')"
echo "Frontend URL: $(gcloud run services describe dixi-frontend --region $REGION --format 'value(status.url)')"
echo "Vision URL: $(gcloud run services describe dixi-vision --region $REGION --format 'value(status.url)')"
