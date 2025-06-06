# Deployment Guide

## Infrastructure Requirements

### Production Environment
- 2+ CPU cores
- 4GB+ RAM
- 20GB+ storage
- Ubuntu 20.04 LTS or newer
- PostgreSQL 13+
- Redis 6+
- Nginx 1.18+

### Development Environment
- 1+ CPU core
- 2GB+ RAM
- 10GB+ storage
- Any modern OS
- SQLite
- Redis (optional)
- Node.js 14+

## Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install required packages
sudo apt install -y python3.8 python3.8-venv python3.8-dev
sudo apt install -y postgresql postgresql-contrib
sudo apt install -y redis-server
sudo apt install -y nginx
sudo apt install -y nodejs npm
```

### 2. Database Setup

```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE teacher_aide_scheduler;
CREATE USER scheduler WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE teacher_aide_scheduler TO scheduler;
\q

# Configure PostgreSQL
sudo nano /etc/postgresql/13/main/postgresql.conf
# Set:
# max_connections = 100
# shared_buffers = 1GB
# effective_cache_size = 3GB
# maintenance_work_mem = 256MB
# checkpoint_completion_target = 0.9
# wal_buffers = 16MB
# default_statistics_target = 100
# random_page_cost = 1.1
# effective_io_concurrency = 200
# work_mem = 16MB
# min_wal_size = 1GB
# max_wal_size = 4GB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/teacher-aide-scheduler
sudo chown $USER:$USER /var/www/teacher-aide-scheduler

# Clone repository
git clone https://github.com/your-org/teacher-aide-scheduler.git /var/www/teacher-aide-scheduler
cd /var/www/teacher-aide-scheduler

# Set up Python virtual environment
python3.8 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up frontend
cd frontend
npm install
npm run build
cd ..

# Create environment file
cp .env.example .env
nano .env
# Set:
# FLASK_APP=app
# FLASK_ENV=production
# DATABASE_URL=postgresql://scheduler:your_password@localhost/teacher_aide_scheduler
# REDIS_URL=redis://localhost:6379/0
# SECRET_KEY=your_secret_key
# JWT_SECRET_KEY=your_jwt_secret

# Initialize database
flask db upgrade
```

### 4. Gunicorn Setup

```bash
# Install Gunicorn
pip install gunicorn

# Create systemd service
sudo nano /etc/systemd/system/teacher-aide-scheduler.service
```

Service file content:
```ini
[Unit]
Description=Teacher Aide Scheduler
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/teacher-aide-scheduler
Environment="PATH=/var/www/teacher-aide-scheduler/venv/bin"
ExecStart=/var/www/teacher-aide-scheduler/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 "app:create_app()"
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl start teacher-aide-scheduler
sudo systemctl enable teacher-aide-scheduler
```

### 5. Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/teacher-aide-scheduler
```

Configuration content:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/teacher-aide-scheduler/static;
        expires 30d;
    }

    location /assets {
        alias /var/www/teacher-aide-scheduler/frontend/build;
        expires 30d;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/teacher-aide-scheduler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Configuration

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl status certbot.timer
```

## Monitoring Setup

### 1. Prometheus

```bash
# Install Prometheus
sudo apt install -y prometheus

# Configure Prometheus
sudo nano /etc/prometheus/prometheus.yml
```

Add to configuration:
```yaml
scrape_configs:
  - job_name: 'teacher-aide-scheduler'
    static_configs:
      - targets: ['localhost:5000']
```

### 2. Grafana

```bash
# Install Grafana
sudo apt install -y grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

## Backup Strategy

### 1. Database Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-db.sh
```

Script content:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/teacher-aide-scheduler"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U scheduler teacher_aide_scheduler > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
find "$BACKUP_DIR" -type f -mtime +7 -delete
```

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-db.sh

# Add to crontab
sudo crontab -e
# Add:
# 0 2 * * * /usr/local/bin/backup-db.sh
```

### 2. Application Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-app.sh
```

Script content:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/teacher-aide-scheduler"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf "$BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz" /var/www/teacher-aide-scheduler
find "$BACKUP_DIR" -type f -mtime +7 -delete
```

## Maintenance Procedures

### 1. Application Updates

```bash
# Pull latest changes
cd /var/www/teacher-aide-scheduler
git pull

# Update dependencies
source venv/bin/activate
pip install -r requirements.txt

# Update frontend
cd frontend
npm install
npm run build
cd ..

# Run migrations
flask db upgrade

# Restart application
sudo systemctl restart teacher-aide-scheduler
```

### 2. Log Rotation

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/teacher-aide-scheduler
```

Configuration content:
```
/var/log/teacher-aide-scheduler/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload teacher-aide-scheduler
    endscript
}
```

## Troubleshooting

### Common Issues

1. **Application Not Starting**
   ```bash
   # Check logs
   sudo journalctl -u teacher-aide-scheduler
   
   # Check permissions
   sudo chown -R www-data:www-data /var/www/teacher-aide-scheduler
   ```

2. **Database Connection Issues**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection
   psql -U scheduler -d teacher_aide_scheduler
   ```

3. **Nginx Issues**
   ```bash
   # Check configuration
   sudo nginx -t
   
   # Check logs
   sudo tail -f /var/log/nginx/error.log
   ```

### Performance Tuning

1. **Database Optimization**
   ```sql
   -- Analyze tables
   ANALYZE VERBOSE teacher_aide;
   ANALYZE VERBOSE assignment;
   ANALYZE VERBOSE task;
   ```

2. **Application Tuning**
   ```bash
   # Adjust Gunicorn workers
   sudo nano /etc/systemd/system/teacher-aide-scheduler.service
   # Update ExecStart with appropriate worker count
   ```

3. **Nginx Tuning**
   ```nginx
   # Add to nginx.conf
   worker_processes auto;
   worker_rlimit_nofile 65535;
   
   events {
       worker_connections 65535;
       multi_accept on;
   }
   ```