use actix_web::{middleware::Logger, web, App, HttpResponse, HttpServer, Responder};
use anyhow::Context;
use chrono::{DateTime, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: PgPool,
    jwt_secret: String,
}

#[derive(sqlx::FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
struct User {
    id: Uuid,
    name: String,
    email: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct CreateUserRequest {
    name: String,
    email: String,
}

#[derive(Deserialize)]
struct UpdateUserRequest {
    name: Option<String>,
    email: Option<String>,
}

#[derive(sqlx::FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
struct Project {
    id: Uuid,
    name: String,
    key: String,
    workspace_id: Uuid,
}

#[derive(sqlx::FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
struct Issue {
    id: Uuid,
    project_id: Uuid,
    title: String,
    description: String,
    status: String,
    priority: String,
    creator_id: Uuid,
    assignee_id: Option<Uuid>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NewIssue {
    project_id: Uuid,
    title: String,
    description: String,
    status: String,
    priority: String,
    creator_id: Uuid,
    assignee_id: Option<Uuid>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PatchIssue {
    id: Uuid,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee_id: Option<Uuid>,
}

#[derive(sqlx::FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
struct Comment {
    id: Uuid,
    issue_id: Uuid,
    author_id: Uuid,
    body: String,
    created_at: DateTime<Utc>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NewComment {
    issue_id: Uuid,
    author_id: Uuid,
    body: String,
}

#[derive(Serialize)]
struct LoginResponse {
    token: String,
    user: LoginUser,
}
#[derive(Serialize)]
struct LoginUser {
    id: Uuid,
    name: String,
}

#[derive(Serialize)]
struct Claims {
    sub: String,
    exp: usize,
}

async fn health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({"ok": true}))
}

async fn list_users(state: web::Data<AppState>) -> actix_web::Result<HttpResponse> {
    let rows = sqlx::query_as::<_, User>("SELECT * FROM users ORDER BY created_at DESC")
        .fetch_all(&state.db)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(rows))
}

async fn create_user(
    state: web::Data<AppState>,
    body: web::Json<CreateUserRequest>,
) -> actix_web::Result<HttpResponse> {
    let row = sqlx::query_as::<_, User>("INSERT INTO users(name,email) VALUES ($1,$2) RETURNING *")
        .bind(&body.name)
        .bind(&body.email)
        .fetch_one(&state.db)
        .await
        .map_err(actix_web::error::ErrorBadRequest)?;
    Ok(HttpResponse::Created().json(row))
}

async fn update_user(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateUserRequest>,
) -> actix_web::Result<HttpResponse> {
    let id = path.into_inner();
    let row = sqlx::query_as::<_, User>(
        "UPDATE users SET name = COALESCE($2,name), email = COALESCE($3,email), updated_at = NOW() WHERE id=$1 RETURNING *",
    )
    .bind(id)
    .bind(&body.name)
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;
    match row {
        Some(user) => Ok(HttpResponse::Ok().json(user)),
        None => Ok(HttpResponse::NotFound().finish()),
    }
}

async fn login(state: web::Data<AppState>) -> actix_web::Result<HttpResponse> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users ORDER BY created_at ASC LIMIT 1")
        .fetch_one(&state.db)
        .await
        .map_err(actix_web::error::ErrorUnauthorized)?;
    let claims = Claims {
        sub: user.id.to_string(),
        exp: (Utc::now().timestamp() + 3600) as usize,
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )
    .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(LoginResponse {
        token,
        user: LoginUser {
            id: user.id,
            name: user.name,
        },
    }))
}

async fn list_projects(state: web::Data<AppState>) -> actix_web::Result<HttpResponse> {
    let rows = sqlx::query_as::<_, Project>(
        "SELECT id,name,key,workspace_id FROM projects ORDER BY created_at DESC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(rows))
}

async fn list_issues(
    state: web::Data<AppState>,
    q: web::Query<std::collections::HashMap<String, String>>,
) -> actix_web::Result<HttpResponse> {
    let project_id = q.get("projectId");
    let status = q.get("status");
    let rows =
        match (project_id, status) {
            (Some(pid), Some(st)) => sqlx::query_as::<_, Issue>(
                "SELECT * FROM issues WHERE project_id=$1 AND status=$2 ORDER BY updated_at DESC",
            )
            .bind(pid)
            .bind(st)
            .fetch_all(&state.db)
            .await,
            (Some(pid), None) => {
                sqlx::query_as::<_, Issue>(
                    "SELECT * FROM issues WHERE project_id=$1 ORDER BY updated_at DESC",
                )
                .bind(pid)
                .fetch_all(&state.db)
                .await
            }
            (None, Some(st)) => {
                sqlx::query_as::<_, Issue>(
                    "SELECT * FROM issues WHERE status=$1 ORDER BY updated_at DESC",
                )
                .bind(st)
                .fetch_all(&state.db)
                .await
            }
            _ => {
                sqlx::query_as::<_, Issue>("SELECT * FROM issues ORDER BY updated_at DESC")
                    .fetch_all(&state.db)
                    .await
            }
        }
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(rows))
}

async fn create_issue(
    state: web::Data<AppState>,
    body: web::Json<NewIssue>,
) -> actix_web::Result<HttpResponse> {
    let row = sqlx::query_as::<_, Issue>("INSERT INTO issues(project_id,title,description,status,priority,creator_id,assignee_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *")
        .bind(body.project_id).bind(&body.title).bind(&body.description).bind(&body.status).bind(&body.priority).bind(body.creator_id).bind(body.assignee_id)
        .fetch_one(&state.db).await.map_err(actix_web::error::ErrorBadRequest)?;
    Ok(HttpResponse::Created().json(row))
}

async fn patch_issue(
    state: web::Data<AppState>,
    body: web::Json<PatchIssue>,
) -> actix_web::Result<HttpResponse> {
    let row = sqlx::query_as::<_, Issue>("UPDATE issues SET title=COALESCE($2,title),description=COALESCE($3,description),status=COALESCE($4,status),priority=COALESCE($5,priority),assignee_id=COALESCE($6,assignee_id),updated_at=NOW() WHERE id=$1 RETURNING *")
        .bind(body.id).bind(&body.title).bind(&body.description).bind(&body.status).bind(&body.priority).bind(body.assignee_id)
        .fetch_optional(&state.db).await.map_err(actix_web::error::ErrorInternalServerError)?;
    match row {
        Some(issue) => Ok(HttpResponse::Ok().json(issue)),
        None => Ok(HttpResponse::NotFound().finish()),
    }
}

async fn list_comments(
    state: web::Data<AppState>,
    q: web::Query<std::collections::HashMap<String, String>>,
) -> actix_web::Result<HttpResponse> {
    let issue_id = q
        .get("issueId")
        .ok_or_else(|| actix_web::error::ErrorBadRequest("issueId is required"))?;
    let rows = sqlx::query_as::<_, Comment>(
        "SELECT * FROM comments WHERE issue_id=$1 ORDER BY created_at DESC",
    )
    .bind(issue_id)
    .fetch_all(&state.db)
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(rows))
}

async fn create_comment(
    state: web::Data<AppState>,
    body: web::Json<NewComment>,
) -> actix_web::Result<HttpResponse> {
    let row = sqlx::query_as::<_, Comment>(
        "INSERT INTO comments(issue_id,author_id,body) VALUES ($1,$2,$3) RETURNING *",
    )
    .bind(body.issue_id)
    .bind(body.author_id)
    .bind(&body.body)
    .fetch_one(&state.db)
    .await
    .map_err(actix_web::error::ErrorBadRequest)?;
    Ok(HttpResponse::Created().json(row))
}

async fn bootstrap_default_data(pool: &PgPool) -> anyhow::Result<()> {
    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users(name, email) VALUES ('System Admin', 'admin@acuguard.local') ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id",
    )
    .fetch_one(pool)
    .await?;

    let workspace_id: Uuid = sqlx::query_scalar(
        "INSERT INTO workspaces(name) VALUES ('Default Workspace') ON CONFLICT DO NOTHING RETURNING id",
    )
    .fetch_optional(pool)
    .await?
    .unwrap_or_else(|| Uuid::nil());

    let workspace_id = if workspace_id.is_nil() {
        sqlx::query_scalar::<_, Uuid>("SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1")
            .fetch_one(pool)
            .await?
    } else {
        workspace_id
    };

    sqlx::query(
        "INSERT INTO projects(name, key, workspace_id) VALUES ('AcuGuard', 'ACU', $1) ON CONFLICT DO NOTHING",
    )
    .bind(workspace_id)
    .execute(pool)
    .await?;

    sqlx::query("UPDATE users SET updated_at = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    Ok(())
}

async fn run_schema(pool: &PgPool) -> anyhow::Result<()> {
    let sql = std::fs::read_to_string("sql/schema.sql")?;
    for stmt in sql.split(';').map(str::trim).filter(|s| !s.is_empty()) {
        sqlx::query(stmt).execute(pool).await?;
    }
    Ok(())
}

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    env_logger::init();
    let database_url = std::env::var("DATABASE_URL").context("DATABASE_URL is required")?;
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret".to_string());
    let bind = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await?;
    run_schema(&pool)
        .await
        .context("failed to apply bootstrap DDL")?;
    bootstrap_default_data(&pool)
        .await
        .context("failed to bootstrap default data")?;

    let state = web::Data::new(AppState {
        db: pool,
        jwt_secret,
    });
    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(state.clone())
            .route("/healthz", web::get().to(health))
            .service(
                web::scope("/api")
                    .route("/auth/login", web::post().to(login))
                    .route("/users", web::get().to(list_users))
                    .route("/users", web::post().to(create_user))
                    .route("/users/{id}", web::patch().to(update_user))
                    .route("/projects", web::get().to(list_projects))
                    .route("/issues", web::get().to(list_issues))
                    .route("/issues", web::post().to(create_issue))
                    .route("/issues", web::patch().to(patch_issue))
                    .route("/comments", web::get().to(list_comments))
                    .route("/comments", web::post().to(create_comment)),
            )
    })
    .workers(num_cpus::get())
    .bind(bind)?
    .run()
    .await?;
    Ok(())
}
