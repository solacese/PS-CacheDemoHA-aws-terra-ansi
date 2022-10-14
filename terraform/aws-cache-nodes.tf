####################################################################################################
# INSTRUCTIONS:
# (1) Customize these instance values to your preference.  
#       * instance_type
#       * availability_zone
#       * tags
# (2) Make sure the account you're running terraform with has proper permissions in your AWS env
####################################################################################################

resource "aws_instance" "cache-nodes" {
  count = var.cache_nodes_count
  
  ami                    = var.centOS_ami[var.aws_region]
  key_name               = var.aws_ssh_key_name
  vpc_security_group_ids = var.msging_secgroup_ids == [""] ? ["${aws_security_group.msging_secgroup[0].id}"] : var.msging_secgroup_ids 
  subnet_id              = var.subnet_primary_id == "" ? aws_subnet.solace_primary_subnet[0].id : var.subnet_primary_id
  associate_public_ip_address = true
  
  disable_api_termination = false  
  instance_type          = var.cache_vm_type
  availability_zone      = "${var.aws_region}a"

  root_block_device {
    volume_type           = "gp2"
    volume_size           = 8
    delete_on_termination = true
  }

  tags = {
    Name    = "${var.tag_name_prefix}-cache-node-${count.index}"
    Owner   = var.tag_owner
    Purpose = "${var.tag_purpose} - Soalce Cache node"
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

resource "local_file" "cache_inv_file" {
  content = templatefile("./templates/inventory/cache-nodes.tpl",
    {
      cache_node_publicips = aws_instance.cache-nodes.*.public_ip
      #if there are no Public IPs
      cache_node_privateips = aws_instance.cache-nodes.*.private_ip
    }
  )
  filename = "../ansible/inventory/cache-nodes.inventory"
}

# Trigger Ansible Tasks for the cache Nodes - Only after all the VM resources and Ansible Inventories & Playbooks have been created
resource "null_resource" "trigger_cache_ansible" {
  provisioner "local-exec" {
    #command = "echo DONE"
    command = "ansible-playbook -i ${local_file.cache_inv_file.filename} -e 'broker_primary_private_ip=${aws_instance.solace-broker-primary[0].private_ip} broker_backup_private_ip=${aws_instance.solace-broker-backup[0].private_ip}' --private-key ${var.private_key_path} ../ansible/playbooks/bootstrap/aws-cache-centosnodes.yml"
  }
  depends_on = [local_file.cache_inv_file]
}
