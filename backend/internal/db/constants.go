package db

// SQL query fragments for SQLite
// PostgreSQL implementations use inline SQL with $1, $2, etc. parameters
const (
	sqlOrderByCreatedAtDesc = ` ORDER BY created_at DESC`
	sqlAndCampaignIDEquals  = ` AND campaign_id = ?`
)
