# butler-spyglass

Butler Spyglass is a tool for extracting metadata from Qlik Sense applications.
The tool will extract metadata for all applications in a Qlik Sense environment.

## Why extract app metadata


## Extracted data
Extracted information for each app is

1. Load script
2. Data lineage, i.e. what data sources are used by the app in question.

### Load script
Whether or not to extract app load scripts is controlled by the configuration parameter ```ButlerSpyglass.script.enableScriptExtract```. Set to true/false as needed.

Each app's load script is extracted and stored in a file in a folder as defined by the ```ButlerSpyglass.script.scriptFolder``` configuration parameter.
Each file will be use the app ID as file name.

### Data lineage

Whether or not to extract data lineage info for apps is controlled by the configuration parameter ```ButlerSpyglass.lineage.enableLineageExtract```. Set to true/false as needed.

Data lineage information is stored in a single CSV (```lineage.csv```) file in a folder defined by the ```ButlerSpyglass.lineage.lineageFolder``` configuration parameter.

## Config file

Make a copy of ```./config/production-template.yaml```, call the new file production.yaml. Edit as needed to match your Qlik Sense Enterprise environment.

## Running Butler Spyglass

Once the config file is in place there are several ways to run Butler Spyglass.

## Run from command line

    node index.js

## Run using Docker

Using Docker arguably the easiest way to deploy Butler Spyglass. A few things to keep in mind though:

* The NODE_ENV variable in the ```docker-compose.yml``` file controls what config file will be used. If NODE_ENV is set to *production*, the file ```./config/production.yaml``` will be used.
* The output directories defined in the ```./config/production.yaml``` file must match the volume mapping in the docker-compose.yml file. I.e. if the config file defines the output directories as ```./myoutdir/lineage``` ```./myoutdir/script```, the docker-compose file must map the containers /nodeapp/myoutdir to an existing directory on the Docker host:
```./out:/nodeapp/myoutdir```.

## Sample output

With log level set to VERBOSE set in the config file, output might look like this:

![Running Butler Spyglass](img/running-butler-spyglass-1.png "With verbose logging level, information about individual apps is shown.")
