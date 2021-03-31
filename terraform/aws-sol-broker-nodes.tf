####################################################################################################
# INSTRUCTIONS:
# (1) Customize these instance values to your preference.  
#       * instance_type
#       * availability_zone
#       * tags
# (2) On the Ansible Playbooks & Var files - Adjust the PubSub+ SW Broker:
#         - Scaling tier 
#         - external storage device name - ex: /dev/sdc or /dev/xvdc
#         - Docker Version
#         - Solace Image Type, Standard, Enterprise or Enterprise Eval
#     according to the VM size/type
# (3) Make sure the account you're running terraform with has proper permissions in your AWS env
####################################################################################################

resource "aws_instance" "solace-broker-primary" {
  count = var.solace_broker_count

  ami                    = var.centOS_ami[var.aws_region]
  key_name               = var.aws_ssh_key_name
  subnet_id              = var.subnet_primary_id == "" ? aws_subnet.solace_primary_subnet[0].id : var.subnet_primary_id
  vpc_security_group_ids = var.solacebroker_secgroup_ids == [""] ? ["${aws_security_group.solacebroker_secgroup[0].id}"] : var.solacebroker_secgroup_ids 

  instance_type          = var.sol_messaging_vm_type
  availability_zone      = "${var.aws_region}a" #Each node of the Cluster on a different AZ

  root_block_device {
    volume_type           = "gp2"
    volume_size           = 8
    delete_on_termination = true
  }
  
  ebs_block_device {
    device_name = var.solacebroker_storage_device_name
    volume_size = var.solacebroker_storage_size
    delete_on_termination = true

    volume_type = "gp2"
#    volume_type = "io1"
#    iops = var.solacebroker_storage_iops
  }

  tags = {
    Name    = "${var.tag_name_prefix}-solbroker-primary-${count.index}"
    Owner   = var.tag_owner
    Purpose = "${var.tag_purpose} - HA Primary Broker node"
    Days    = var.tag_days
  }
  
# Do not flag the aws_instance resource as completed, until the VM is able to accept SSH connections, otherwise the Ansible call will fail  
  provisioner "remote-exec" {
    inline = ["echo 'SSH ready to rock'"]

    connection {
      host        = self.public_ip
      type        = "ssh"
      user        = var.ssh_user
      private_key = file(var.private_key_path)
    }
  }
}

resource "aws_instance" "solace-broker-backup" {
  count = var.solace_broker_count

  ami                    = var.centOS_ami[var.aws_region]
  key_name               = var.aws_ssh_key_name
  subnet_id              = var.subnet_backup_id == "" ? aws_subnet.solace_backup_subnet[0].id : var.subnet_backup_id
  vpc_security_group_ids = var.solacebroker_secgroup_ids == [""] ? ["${aws_security_group.solacebroker_secgroup[0].id}"] : var.solacebroker_secgroup_ids 

  instance_type          = var.sol_messaging_vm_type
  availability_zone      = "${var.aws_region}b" #Each node of the Cluster on a different AZ

  root_block_device {
    volume_type           = "gp2"
    volume_size           = 8
    delete_on_termination = true
  }
  
  ebs_block_device {
    device_name = var.solacebroker_storage_device_name
    volume_size = var.solacebroker_storage_size
    delete_on_termination = true

    volume_type = "gp2"
#    volume_type = "io1"
#    iops = var.solacebroker_storage_iops
  }

  tags = {
    Name    = "${var.tag_name_prefix}-solbroker-backup-${count.index}"
    Owner   = var.tag_owner
    Purpose = "${var.tag_purpose} - HA Backup Broker node"
    Days    = var.tag_days
  }

# Do not flag the aws_instance resource as completed, until the VM is able to accept SSH connections, otherwise the Ansible call will fail  
  provisioner "remote-exec" {
    inline = ["echo 'SSH ready to rock'"]

    connection {
      host        = self.public_ip
      type        = "ssh"
      user        = var.ssh_user
      private_key = file(var.private_key_path)
    }
  }
}

resource "aws_instance" "solace-broker-monitor" {
  count = var.solace_broker_count

  ami                    = var.centOS_ami[var.aws_region]
  key_name               = var.aws_ssh_key_name
  subnet_id              = var.subnet_monitor_id == "" ? aws_subnet.solace_monitor_subnet[0].id : var.subnet_monitor_id
  vpc_security_group_ids = var.solacebroker_secgroup_ids == [""] ? ["${aws_security_group.solacebroker_secgroup[0].id}"] : var.solacebroker_secgroup_ids 

  instance_type          = var.sol_monitor_vm_type
  availability_zone      = "${var.aws_region}c" #Each node of the Cluster on a different AZ

  root_block_device {
    volume_type           = "gp2"
    volume_size           = 8
    delete_on_termination = true
  }
  
  ebs_block_device {
    device_name = var.solacebroker_storage_device_name
    volume_size = var.solacebroker_storage_size
    delete_on_termination = true

    volume_type = "gp2"
#    volume_type = "io1"
#    iops = var.solacebroker_storage_iops
  }

  tags = {
    Name    = "${var.tag_name_prefix}-solbroker-monitor-${count.index}"
    Owner   = var.tag_owner
    Purpose = "${var.tag_purpose} - HA Monitor Broker node"
    Days    = var.tag_days
  }

# Do not flag the aws_instance resource as completed, until the VM is able to accept SSH connections, otherwise the Ansible call will fail  
  provisioner "remote-exec" {
    inline = ["echo 'SSH ready to rock'"]

    connection {
      host        = self.public_ip
      type        = "ssh"
      user        = var.ssh_user
      private_key = file(var.private_key_path)
    }
  }
}

resource "local_file" "solbroker_inv_file" {
  content = templatefile("./templates/inventory/sol-broker-nodes.tpl",
    {
      solace-primary-ips = aws_instance.solace-broker-primary.*.public_ip,
      solace-backup-ips = aws_instance.solace-broker-backup.*.public_ip,
      solace-monitor-ips = aws_instance.solace-broker-monitor.*.public_ip
      solace-primary-privateips = aws_instance.solace-broker-primary.*.private_ip,
      solace-backup-privateips = aws_instance.solace-broker-backup.*.private_ip,
      solace-monitor-privateips = aws_instance.solace-broker-monitor.*.private_ip
    }
  )
  filename = "../ansible/inventory/sol-broker-nodes.inventory"
}

# Trigger Ansible Tasks for the Brokers - Only after all the VM resources and Ansible Inventories & Playbooks have been created
resource "null_resource" "trigger_broker_ansible" {
  provisioner "local-exec" {
    command = "ansible-playbook -i ${local_file.solbroker_inv_file.filename} --private-key ${var.private_key_path} ../ansible/playbooks/bootstrap/aws-ha-sol-broker-centosnodes.yml"
  }

  depends_on = [
    local_file.solbroker_inv_file
  ]
}
