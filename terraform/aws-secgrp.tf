####################################################################################################
# NOTE: The following network resources will only get created if:
# The "solace_secgroup_ids" variable is left "empty"
####################################################################################################

#Query the VPC id for the specified VPC subnet
data "aws_subnet" "input_subnet_id" {
  count = var.subnet_primary_id == "" ? 0 : 1

  id = var.subnet_primary_id
}

resource "aws_security_group" "solacebroker_secgroup"{
  #If no broker security group was specified, we'll create one
  count = var.solacebroker_secgroup_ids == [""] ? 1 : 0

  #If a VPC Subnet was specified we'll query its VPC id and use it, otherwise use the VPC that was just created
  vpc_id = var.subnet_primary_id == "" ? aws_vpc.solace_vpc[0].id : data.aws_subnet.input_subnet_id[0].vpc_id

  name = "${var.tag_name_prefix}-solacebroker-secgroup"
  description = "Allow TCP traffic to the Solace Broker PoC instances" 
  egress{
    from_port = 0
    to_port = 0 
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress{
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    #security_groups = var.solace_secgroup_ids == [""] ? ["${aws_security_group.solace_secgroup[0].id}"] : var.solace_secgroup_ids
  }
# CLI
  ingress{
    from_port = 2222
    to_port = 2222
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
# Management port
  ingress{
    from_port = 8080
    to_port = 8080
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
# Web Transport  
  ingress{
    from_port = 8008
    to_port = 8008
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
#Solace Message Format (SMF) - plain text 
  ingress{
    from_port = 55555
    to_port = 55555
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
#Solace Message Format (SMF) - compresion
  ingress{
    from_port = 55003
    to_port = 55003
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
#Solace Message Format (SMF) - ssl 
  ingress{
    from_port = 55443
    to_port = 55443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

#MQTT Range
  ingress{
    from_port = 1883
    to_port = 1884
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

#REST Range
  ingress{
    from_port = 9000
    to_port = 9001
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

#HA Ports
 ingress{
    from_port = 8741
    to_port = 8741
    protocol = "tcp"
    self      = true
  }

 ingress{
    from_port = 8300
    to_port = 8302
    protocol = "tcp"
    self      = true
  }
 
 ingress{
    from_port = 8301
    to_port = 8302
    protocol = "udp"
    self      = true
  }

  tags = {
      Name    = "${var.tag_name_prefix}-solacebroker-secgroup"
      Owner   = var.tag_owner
      Purpose = var.tag_purpose
      Days    = var.tag_days
  }
}



resource "aws_security_group" "msging_secgroup"{
  #If no sdkperf security group was specified, we'll create one
  count = var.msging_secgroup_ids == [""] ? 1 : 0

  #If a VPC Subnet was specified we'll query its VPC id and use it, otherwise use the VPC that was just created
  vpc_id = var.subnet_primary_id == "" ? aws_vpc.solace_vpc[0].id : data.aws_subnet.input_subnet_id[0].vpc_id

  name = "msging_secgroup"
  description = "Allow SSH traffic to sdkperf benchmarking instances" 
  egress{
    from_port = 0
    to_port = 0 
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress{
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress{
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress{
    from_port = 8080
    to_port = 8089
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
      Name    = "${var.tag_name_prefix}-sdkperf-secgroup"
      Owner   = var.tag_owner
      Purpose = var.tag_purpose
      Days    = var.tag_days
  }
}
