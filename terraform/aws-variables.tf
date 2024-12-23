####################################################################################################
# INSTRUCTIONS:
# (1) Customize these variables to your perference
# (2) Make sure the account you're running terraform with has proper permissions in your AWS env
####################################################################################################

# aws config
variable "aws_region" {
  default = "us-east-1"
}

# ssh config
# If the Key Pair is already created on AWS leave an empty public_key_path, otherwise terraform will try to create it and upload the public key
variable "aws_ssh_key_name" {
  default = "psdefault_cache_demo_tfsa_key"
  description = "The Key pair Name to be created on AWS."
}
# If no  Private and Public Keys exist, they can be created with the "ssh-keygen -f ../aws_key" command
variable "public_key_path" {
  default = "../keys/SolCache_key.pub"
  description = "Local path to the public key to be uploaded to AWS"
}
variable "private_key_path" {
  default = "../keys/SolCache_key"
  description = "Local path to the private key used to connect to the Instances (Not to be uploaded to AWS)"
}
variable "ssh_user" {
  default = "ubuntu"
  description = "SSH user to connect to the created instances (defined by the AMI being used)"
}

# General Variables
variable "tag_owner" {
  default = "psdefault"
}
variable "tag_days" {
  default = "1"
}
variable "tag_purpose" {
  default = "General PubSub+ Cache Testing"
}
variable "tag_name_prefix" {
  default = "psdefault-SolaceCache"
}

# cache nodes count
variable "cache_nodes_count" {
    default = "4"
    type        = string
    description = "The number of cache nodes to be created."
}
variable "cache_vm_type" {
  default = "c5.large"     # (2 CPUs 4G RAM - General Purpose)
  #default = "c5.xlarge"    # (4 CPUs 8G RAM - General Purpose)
}

# MarketData FeedHandler & MDMonitor nodes count
variable "client_nodes_count" {
    default = "1"
    type        = string
    description = "The number of client nodes to be created."
}
variable "client_vm_type" {
  default = "m5.large"    # (2 CPUs  8G RAM - General Purpose)
  #default = "m5.xlarge"    # (4 CPUs 16G RAM - General Purpose)
}

# Solace Brokers
# HA Clusters count
variable "solace_broker_count" {
    default = "1"
    type        = string
    description = "The number of Solace Broker nodes to be created."
}
variable "sol_messaging_vm_type" {
  default = "m5.large"    # (2 CPUs  8G RAM - General Purpose)
#  default = "m5.xlarge"    # (4 CPUs 16G RAM - General Purpose)
}
variable "sol_monitor_vm_type" {
  default = "t2.medium"   # (2 CPUs  4G RAM - General Purpose Burstable )
}

variable "subnet_primary_id" {
  default = ""
  #default = "subnet-0db7d4f1da1d01bd8"
  type        = string
  description = "The AWS subnet_id to be used for hosting the primary brokers and sdkperf nodes - Leave the value empty for automatically creating one."
}
variable "subnet_backup_id" {
  default = ""
  type        = string
  description = "The AWS subnet_id to be used for hosting the backup brokers - If the subnet_primary_id value is left empty we'll automatically create all the Subnets. Otherwise this value must be specified and consistent"
}
variable "subnet_monitor_id" {
  default = ""
  type        = string
  description = "The AWS subnet_id to be used for hosting the monitor brokers - If the subnet_primary_id value is left empty we'll automatically create all the Subnets. Otherwise this value must be specified and consistent"
}


variable "solacebroker_secgroup_ids" {
  default = [""]
  #default = ["sg-08a5f21a2e6ebf19e"]
  description = "The AWS security_group_ids to be asigned to the Solace broker nodes - Leave the value empty for automatically creating one."
}
variable "msging_secgroup_ids" {
  default = [""]
  #default = ["sg-08a5f21a2e6ebf19e"]
  description = "The AWS security_group_ids to be asigned to the Messaging nodes - Leave the value empty for automatically creating one."
}

variable "ubuntu24_ami" {
  type        = map
  default = { #Ubuntu Server 24.04 LTS
    us-east-1 = "ami-0e2c8caa4b6378d8c"
    us-east-2 = "ami-036841078a4b68e14"
    us-west-1 = "ami-0657605d763ac72a8"
    us-west-2 = "ami-05d38da78ce859165"
  }
}

# Solace Broker External Storage Variables
variable "solacebroker_storage_device_name" {
  default = "/dev/sdc"
  description = "device name to assign to the storage device"
}
variable "solacebroker_storage_size" {
  default = 100 
#  default = 700 # (2100 IOPs on a gp2)  
#  default = 1024 # (3072 IOPs on a gp2)  
  description = "Size of the Storage Device in GB"
}
variable "solacebroker_storage_iops" {
  default = "3000"
  description = "Number of IOPs to allocate to the Storage device - must be a MAX ratio or 1:50 of the Storage Size"
}
