# /keys

SSH Keys to access the VMs should be stored by default on this directory. 

If you have preexisting SSH Keys copy them here. Otherwise, they can be created by running the following command:

   ```   
     ssh-keygen -f new_key
   ```

Afterwards you'll have to update the **public_key_path** & **private_key_path** variables located on the [../terraform/aws-variables.tf](../terraform/aws-variables.tf) file, to make the default value match the correct name of your ssh key files. Ex:

```
variable "public_key_path" {
  default = "../keys/SolCache_key.pub"
  description = "Local path to the public key to be uploaded to AWS"
}
variable "private_key_path" {
  default = "../keys/SolCache_key"
  description = "Local path to the private key used to connect to the Instances (Not to be uploaded to AWS)"
}
```

## Warnings
> :warning: Unless all the scripts have been modified to use a different path, **DO NOT DELETE THIS FOLDER!**

> :warning: The SSH keys to be used should have restrictive permissions (ex: 600), otherwise Terraform and Ansible could trigger an error while connecting to the VMs
