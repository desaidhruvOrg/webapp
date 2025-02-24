packer {
  required_plugins {
    amazon = {
      source  = "github.com/hashicorp/amazon"
      version = "~> 1.2.6"
    }
    googlecompute = {
      source  = "github.com/hashicorp/googlecompute"
      version = "~> 1.1.0"
    }
  }
}

// Update variable names to match GitHub secrets
variable "aws_region" {
  type    = string
  default = null
}

variable "source_ami" {
  type    = string
  default = "ami-0c7217cdde317cfec"  # Ubuntu 24.04 LTS AMI ID
}

variable "ssh_username" {
  type    = string
  default = "ubuntu"
}

variable "subnet_id" {
  type    = string
  default = null
}

// Remove aws_profile as we're using direct credentials from GitHub secrets
variable "db_pass" {  // Changed from db_root_password to match GitHub secrets
  type    = string
  sensitive = true
}

variable "db_name" {
  type    = string
  sensitive = true
}

variable "db_user" {
  type    = string
  sensitive = true
}

variable "gcp_project_id" {
  type    = string
  default = null
}

variable "gcp_zone" {
  type    = string
  default = "us-central1-a"
}

variable "gcp_credentials_file" {
  type    = string
  default = null
}

variable "vpc_id" {
  type    = string
  default = null
}

source "amazon-ebs" "ubuntu" {
  ami_name      = "webapp-ami-${formatdate("YYYY-MM-DD-hh-mm-ss", timestamp())}"
  instance_type = "t2.micro"
  // Remove profile as we're using GitHub Actions credentials
  region        = var.aws_region
  vpc_id        = var.vpc_id
  
  source_ami    = var.source_ami
  ssh_username  = var.ssh_username
  
  subnet_id     = var.subnet_id
  
  aws_polling {
    delay_seconds = 30
    max_attempts  = 50
  }

  tags = {
    Name    = "webapp-ami"
    Project = "csye6225"
  }

  # Volume configuration for root
  root_block_device {
    volume_size           = 25
    volume_type           = "gp2"
    delete_on_termination = true
  }

  # Launch block device mappings
  launch_block_device_mappings {
    device_name           = "/dev/sda1"
    volume_size           = 25
    volume_type          = "gp2"
    delete_on_termination = true
  }
}

// Add parallel GCP builder
source "googlecompute" "ubuntu" {
  project_id          = var.gcp_project_id
  source_image_family = "ubuntu-2404-lts"
  zone                = var.gcp_zone
  ssh_username        = "ubuntu"
  image_name          = "webapp-image-${formatdate("YYYY-MM-DD-hh-mm-ss", timestamp())}"
  
  instance_name       = "packer-builder-${uuid()}"
  machine_type        = "e2-micro"
}

build {
  sources = [
    "source.amazon-ebs.ubuntu",
    "source.googlecompute.ubuntu"
  ]
  
  provisioner "file" {
    source      = "${path.root}/../webapp.zip"
    destination = "/tmp/webapp.zip"
  }

  provisioner "file" {
    source      = "${path.root}/../setup.sh"
    destination = "/tmp/setup.sh"
  }

  provisioner "shell" {
    environment_vars = [
      "DB_PASS=${var.db_pass}",  // Updated to match GitHub secrets
      "DB_NAME=${var.db_name}",
      "DB_USER=${var.db_user}",
      "PORT=8080"
    ]
    inline = [
      "echo 'Debugging environment variables:'",
      "echo DB_PASS=${var.db_pass}",  // Updated debug output
      "echo DB_NAME=${var.db_name}",
      "echo DB_USER=${var.db_user}",
      "chmod +x /tmp/setup.sh",
      "sudo -E /tmp/setup.sh"
    ]
  }
}
