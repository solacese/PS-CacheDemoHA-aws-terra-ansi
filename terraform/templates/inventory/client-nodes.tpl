[client_nodes]
%{ for ip in client_node_publicips ~}
${ip}
%{ endfor ~}

[client_nodes_privateips]
%{ for ip in client_node_privateips ~}
${ip}
%{ endfor ~}