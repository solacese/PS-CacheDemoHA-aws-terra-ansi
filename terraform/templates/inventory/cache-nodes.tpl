[cache_nodes]
%{ for ip in cache_node_publicips ~}
${ip}
%{ endfor ~}

[cache_nodes_privateips]
%{ for ip in cache_node_privateips ~}
${ip}
%{ endfor ~}