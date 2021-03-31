#Cache Nodes
output "cache-node-public-ips" {
  value = ["${aws_instance.cache-nodes.*.public_ip}"]
}
output "cache-node-private-ips" {
  value = ["${aws_instance.cache-nodes.*.private_ip}"]
}

#Solace Brokers
output "solace-broker-monitor-public-ips" {
  value = ["${aws_instance.solace-broker-monitor.*.public_ip}"]
}
output "solace-broker-monitor-private-ips" {
  value = ["${aws_instance.solace-broker-monitor.*.private_ip}"]
}
output "solace-broker-backup-public-ips" {
  value = ["${aws_instance.solace-broker-backup.*.public_ip}"]
}
output "solace-broker-backup-private-ips" {
  value = ["${aws_instance.solace-broker-backup.*.private_ip}"]
}
output "solace-broker-primary-public-ips" {
  value = ["${aws_instance.solace-broker-primary.*.public_ip}"]
}
output "solace-broker-primary-private-ips" {
  value = ["${aws_instance.solace-broker-primary.*.private_ip}"]
}

#Client Nodes
output "client-node-public-ips" {
  value = ["${aws_instance.client-nodes.*.public_ip}"]
}
output "client-node-private-ips" {
  value = ["${aws_instance.client-nodes.*.private_ip}"]
}
