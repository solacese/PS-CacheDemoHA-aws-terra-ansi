# Solace - Terraform & Ansible automated deployment

## Overview

This repository is a collection of Terraform and Ansible configuration files, that automatically provision (on the AWS Cloud) the infrastructure required to run Solace Broker nodes (in HA), as well as Solace PubSub+ Cache nodes plus a Market Data Feed Simulator & a Market Data Sample monitor.

The purpose of this repo is to provide a quick way to create from scratch a working demo that can easily demonstrate the Solace PubSub+ Cache capabilities.

The following image is a high level overview of the PS+ Cache configurations to be created on the brokers. It can be observed that we have: 
+ 2 sources (exchanges) of Market Data publishing prices to different topic prefixes.
+ Web Clients (WebMonitor App) subscribing to all the Market Data available.
+ 2 Distributed Caches: AMER_DistributedCache to manage Cache Clusters for the "Americas region", and EMEA_DistributedCache for future use on the "EMEA region".
+ 2 Cache Clusters (in order to balance the load) within the AMER_DistributedCache: NYSE_CacheCluster to store all the MD from the NYSE exchange (topic MD/NYSE/>) and BMV_CacheCluster to store all the MD from the BMV exchange (topic MD/BMV/>).
+ 4 Cache Instances "PS_CacheInstance_X", 2 Instances per Cache Cluster (in order to achieve HA within a Cache Cluster)

![PS+ Cache Topology](/images/topology.png)

### Warnings

> :warning: This project is intended to serve as a POC for demonstrating the functionality of the Solace PubSub+ Cache, plus the automation capabilities of the Solace Brokers. Therefore, there are several opportunities for improvement.
> :warning: Keep in mind that this code has not been tested or coded to be PRODUCTION ready.


## Getting Started

There are 4 main subdirectories in this repository: 
- [keys](/keys) - Used to store the private & public keys to access via SSH the Solace Broker, PubSub+ Cache and Client nodes
- [terraform](/terraform) - Contains Terraform configuration & template files to create resources on the cloud as well as files to be used by Ansible (Inventories, Playbooks, Variables)
- [ansible](/ansible) - Contains playbooks, inventories, variables & roles to be used by Ansible to configure the VMs. There are static files that can be modified according to what is needed, as well as files that will get dynamically created by Terraform upon execution, based on the resources terraform creates (ex: public or private IPs, etc.).
- [images](/images) - Contains images for the README files

Also, inside of each of those subdirectories, there are README files that can provide extra information as well as describing what CAN or HAS TO be configured on each section.

### Prerequisites

General

+ A control host that will run the Terraform & Ansible Scripts 
+ Install Terraform on the Host - Instructions [here](https://learn.hashicorp.com/terraform/getting-started/install.html)
+ Install Ansible on the host - Instructions [here](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)
+ Disable host key checking by the underlying tools Ansible uses to connect to the host 
   ```
     export ANSIBLE_HOST_KEY_CHECKING=false
   ```

AWS

+ Configure Terraform to use the credentials of a sufficiently privileged IAM role
   You can do this in a number of ways, but I recommend using environment variables as a quick, easy, and secure way of passing your keys to Terraform. Instructions [here](https://www.terraform.io/docs/providers/aws/index.html#environment-variables).
   ```
     export AWS_ACCESS_KEY_ID="accesskey"
     export AWS_SECRET_ACCESS_KEY="secretkey"
   ```
+ Modify the default identification values for the AWS resources on the [../terraform/aws-variables.tf](../terraform/aws-variables.tf) file, set them to something relevant to your demo. Ex:
   ```
variable "aws_ssh_key_name" {
  default = "mmoreno_cache_demo_tfsa_key"
}

variable "tag_owner" {
  default = "Manuel Moreno"
}

variable "tag_name_prefix" {
  default = "mmoreno-SolaceCache"
}

   ```

PubSub+ Cache

+ Get a licensed copy of Solace PS+ Cache Linux binaries, plus a copy of the Solace C API for Linux.
+ Copy your PS+ Cache Linux binaries (ex: SolaceCache_Linux26-x86_64_opt_1.0.8.tar.gz) plus the Solace C API for Linux binaries (ex: solclient_Linux26-x86_64_opt_7.17.0.4.tar.gz) to the path: [/ansible/playbooks/bootstrap/roles/solace/solace-cache/files](/ansible/playbooks/bootstrap/roles/solace/solace-cache/files) 
+ Rename the PS+ Cache Linux binary file to simply "SolaceCache_Linux26.tar.gz"
+ Rename the Solace C API for Linux binary file to simply "solclient_Linux26.tar.gz"

SSH Keys

+ Configure the private & public SSH keys required to login & setup the hosts.
+ Take a look at the README file inside [/keys](/keys) for a more detailed description on how to do it.
> :warning: The SSH keys to be used should have restrictive permissions (ex: 600), otherwise Terraform and Ansible could trigger an error while connecting to the VMs

## Creating Resources

Once all the variables and configurations have been set according to our needs, we can have Terraform create all the infrastructure for us, by going into the appropriate PATH where the Terraform resource files are located (in this case: [/terraform](/terraform)) and typing the following commands:

   ```   
     terraform init
     terraform apply
   ```

and typing "yes" when prompted.

## Navigate to the Market Data monitor Web Application

Once all the resources have been provisioned and configured, you should see a list of IPs:

![Terraform Output](/images/terra_output.png)

Identify the "client-node-public-ips" IP, open a Web Browser, navigate to that IP and you should see the MarketData WebMonitor App like this:

![Web Monitor](/images/web_monitor.png)

## Destroying the resources

Once testing has concluded and the cloud resources are no longer needed, all of them can be destroyed by simply going into the appropriate PATH where the Terraform resource files are located (in this case: [/terraform](/terraform)) and running the Terraform command: 

   ```   
     terraform destroy
   ```

and typing "yes" when prompted.

## Scripts Highlights 

**Depending on the selected Terraform scripts, they will allow you to**:

+ Provision 1 Solace PS+ Software HA Cluster
+ Provision 4 Solace PS+ Cache nodes
+ Provision 1 Market Data client - MD Feed Simulators + MD Monitor Web App

**List of resources to be created by Terraform**:

+ SSH Key Pair to log into the VMs
+ Network VPC (If no existing subnet is specified)
+ Network Subnet, one for each HA node (If no subnet is specified)
+ Network Internet Gateway
+ Network Route Table
+ Security Group for the SDKPerf nodes
+ Security Group for the PS+ Cache & Client nodes
+ PS+ Cache Nodes, Running CentOS 7.7
+ Solace Broker Nodes, Running CentOS 7.7 (HA Configured Nodes)
+ Solace Broker Data External Disk (gp2 or Premium_LRS, io1 & UltraSSD_LRS can also be provisioned if needed)
+ Ansible Inventory File containing Public & Private IPs for Solace Brokers
+ Ansible Inventory File containing Public & Private IPs for PS+ Cache nodes
+ Ansible Inventory File containing Public & Private IPs for the MD Client node
+ Resource Tags:  Name, Owner, Purpose & Days (When applicable)

**List of Tasks to be executed by Ansible at bootstrap**:

On Solace Broker nodes:

+ Enable SWAP on the VM 
+ Partition, Format & Mount external disk
+ Create & Assign permissions for the Broker folders on the external disk
+ Install Docker CE
+ Install docker-compose
+ Parse & upload docker-compose template according to the Solace Broker type (Standard, Enterprise or Enterprise Eval) & Node Role (Standalone, Primary, Backup or Monitor)
+ Copy Solace Broker Image to VM (Only for Enterprise or Enterprise Eval)
+ Load Solace Broker Image (Only for Enterprise or Enterprise Eval)
+ Create and Run Solace Docker container according to the created docker-compose file
+ Install performance monitoring tools on the OS: HTOP, sysstat (iostat)
+ Wait for SEMP to be ready
+ SEMP request to Assert Master Broker
+ SEMP request to update-broker-spoolsize
+ SEMP requests to create Solace configurations on the Solace Brokers

On PS+ Cache nodes:

+ Enable SWAP on the VM 
+ Copy the PS+ Cache & Solace C API binary files to the Cache nodes
+ Configure the PS+ Cache instances to register themselves on the Solace Brokers
+ Run the PS+ Cache as systemd daemon

On Market Data Client node:
+ Enable SWAP on the VM 
+ Install OpenJDK
+ Install httpd
+ Start httpd daemon
+ Copy the MDWebMonitor Web App to the /var/www/html path
+ Copy the MDFeedHandler simulator, and start 2 Exchange instances (NYSE & BMV)

## Customizing the Demo

If you need to customize the PS+ Cache configurations, it can be done by modifing the following files:
+ [/ansible/playbooks/bootstrap/vars/solcache-solace-semp-vars.yml](/ansible/playbooks/bootstrap/vars/solcache-solace-semp-vars.yml) - contains all the values to be used on the SEMP calls used to configure our broker (VPN name, clientusernames, cache clusters, etc)
+ [/ansible/playbooks/bootstrap/aws-cache-centosnodes.yml](/ansible/playbooks/bootstrap/aws-cache-centosnodes.yml) - contains the ansible tasks, plus the variables (VPN name, clientusername, cache instance, etc.) to be used while configuring the PS+ Cache nodes
+ [/ansible/playbooks/bootstrap/aws-client-centosnodes.yml](/ansible/playbooks/bootstrap/aws-client-centosnodes.yml) - contains the ansible tasks, plus the variables (VPN name, clientusername, distributed cache name, etc.) to be used while configuring the MarketData node
+ [/ansible/playbooks/bootstrap/roles/md_demo/MDFeedhandler/tasks/main.yml](/ansible/playbooks/bootstrap/roles/md_demo/MDFeedhandler/tasks/main.yml) - contains the ansible tasks, plus the variables to be used while starting the MDFeedHandler processes. Here you could start more than 2 Exchanges, or modify their name.


## Authors

See the list of [contributors](https://github.com/solacese/terraform-ansible-solace-sdkperf/graphs/contributors) who participated in this project.

## Resources

**To tie Terraform and Ansible together, we do two things:**

- Run an Ansible playbook after the Virtual Machine has been provisioned using Terraform's "local_exec" provisioner
- Generate inventory files from our VM instances by formatting Terraform's output

Terraform will automatically use the playbooks under [/ansible/playbooks/bootstrap](/ansible/playbooks/bootstrap)  to set up our VM instances.  

For more information try these resources:

- Introduction to Terraform at: https://www.terraform.io/intro/index.html
- How Ansible Works at: https://www.ansible.com/overview/how-ansible-works
- Ansible Intro to Playbooks at: https://docs.ansible.com/ansible/latest/user_guide/playbooks_intro.html
- Ansible and HashiCorp (Terraform): Better Togethers at: https://www.hashicorp.com/resources/ansible-terraform-better-together/
- Terraform AWS provider docs at: https://www.terraform.io/docs/providers/aws/index.html
- Install Azure CLI - https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest
- Amazon EC2 Instance Types at: https://aws.amazon.com/ec2/instance-types/
- Get a better understanding of [Solace technology](http://dev.solace.com/tech/).
- Check out the [Solace blog](http://dev.solace.com/blog/) for other interesting discussions around Solace technology
- Ask the [Solace community.](http://dev.solace.com/community/)