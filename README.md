# Butler Spyglass

[![Build status](https://github.com/ptarmiganlabs/butler-spyglass/actions/workflows/release-please.yml/badge.svg?branch=master)](https://github.com/ptarmiganlabs/butler-spyglass/actions/workflows/release-please.yml)
[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)

Butler Spyglass is a tool for extracting metadata from Qlik Sense applications.

The tool will

- Extract data lineage for all or some applications.
- Extract load scripts for all or some applications.
- Extract complete info for all data connections.
- Run once or recurring at a configurable interval.

## Table of contents

- [Butler Spyglass](#butler-spyglass)
  - [Table of contents](#table-of-contents)
  - [Why extract app metadata](#why-extract-app-metadata)
    - [Data lineage](#data-lineage)
    - [Load scripts](#load-scripts)
  - [What's new](#whats-new)
  - [Extracted data](#extracted-data)
    - [Data lineage](#data-lineage-1)
    - [Load scripts](#load-scripts-1)
    - [Data connection definitions](#data-connection-definitions)
  - [Config file](#config-file)
    - [App filters](#app-filters)
  - [Logging](#logging)
  - [Parallel extraction of lineage data](#parallel-extraction-of-lineage-data)
  - [Running Butler Spyglass](#running-butler-spyglass)
    - [Run from command line](#run-from-command-line)
    - [Run using Docker](#run-using-docker)
  - [Output files](#output-files)
    - [Data lineage output files](#data-lineage-output-files)
    - [Load script output files](#load-script-output-files)
    - [Data connections output files](#data-connections-output-files)
  - [Analysing the generated files](#analysing-the-generated-files)
  - [Security / Disclosure](#security--disclosure)

## Why extract app metadata

### Data lineage

When using Sense in enterprise environments, there is often a need to understand both what apps use a certain data source, and what data sources are used by a specific app.

- When de-commissioning an old system that feed several Sense apps with data, it is important to know which these apps are. Butler Spyglass provide this information in the form of data lineage information.
- If a data source contains sensitive information, it is important to always have up-to-date information on what apps use the data source in question.
- Reviewing and auditing apps is greatly simplified if there is clear information on what data sources the app in question uses.

### Load scripts

By storing all app load scripts as individual files on disk, it is possible to snapshot these daily and store them in one ZIP archive for each day. This becomes a historical record of what the scripts looked like in the past.  
Traditional disk backups provide a similar capability to bring back old versions, experience has however proven it to be very valuable to have *quick and easy* access to old script versions, for example if apps have become corrupt or if there is a need to revert back to an earlier app version.

Butler Spyglass solves all the scenarios above by extracting both data lineage information as well as full load scripts for all apps.

## What's new

Each release on the [releases page](https://github.com/ptarmiganlabs/butler-spyglass/releases) contains info what is new, if there are any breaking changes that require special attention etc.

The [change log](https://github.com/ptarmiganlabs/butler-spyglass/blob/master/changelog.md) also keeps a complete log of all details from all releases.

## Extracted data

Extracted information for each app is

1. Data lineage, i.e. what data sources are used by the app in question.
2. Load scripts.

In addition to the above, complete definitions (except credentials, passwords etc) for all data connections in the Qlik Sense server are extracted and stored as CSV and JSON files.

### Data lineage

Whether or not to extract data lineage info for apps is controlled by the configuration parameter `ButlerSpyglass.lineageExtract.enable`. Set to true/false as needed.

Data lineage information is stored in CSV and JSON files, one pair for each Sense app. Files are stored in the directory defined in `ButlerSpyglass.lineageExtract.exportDir`.

More info about discriminators and statements is found [here](https://help.qlik.com/en-US/sense-developer/February2023/Subsystems/EngineJSONAPI/Content/models-lineageinfo.htm).

### Load scripts

Whether or not to extract app load scripts is controlled by the configuration parameter `ButlerSpyglass.scriptExtract.enable`. Set to true/false as needed.

Each app's load script is extracted and stored in a `<appid>.qvs` file in a folder as defined by the `ButlerSpyglass.scriptExtract.exportDir` configuration parameter.

### Data connection definitions

Whether or not to extract data connection definitions is controlled by the config parameter `ButlerSpyglass.dataConnectionExtract.enable`. Set to true/false as needed.

Data connections are stored to `dataconnection.json` and `dataconnection.csv` in the directory specified by `ButlerSpyglass.dataConnectionExtract.exportDir`.

## Config file

A template config file is available [here](https://github.com/ptarmiganlabs/butler-spyglass/blob/master/config/production-template.yaml).  
How to name and where to store the config file is described [here](#running-butler-spyglass).

The parameters in the config file are described below.
All parameters must be defined in the config file - run time errors will occur otherwise.

| Parameter | Description |
| --------- | ----------- |
| logLevel | The level of details in the logs. Possible values are silly, debug, verbose, info, warn, error (in order of decreasing level of detail). |
| fileLogging | true/false to enable/disable logging to disk file |
| logDirectory | Subdirectory where log files are stored |
| extract.frequency | Time between extraction runs. 60000 means that the next extraction run will start 60 seconds after the previous one ends. Milliseconds |
| extract.itemInterval | Time between two sets of apps are extracted. The number of apps in a set is defined by `extract.concurrentTasks` (below). For example, if set to 500 there will be a 0.5 sec delay between sets of apps are sent to the Qlik Sense engine API. Milliseconds |
| extract.itemTimeout | Timeout for the call to the engine API. For example, if set to 5000 and no response has been received from the engine API within 5 seconds, an error will be thrown. Milliseconds   |
| extract.concurrentTasks | Number of apps that will be sent in parallel to the engine API. Use with caution! You can easily affect performance of a Sense environment by setting this parameter too high. Start setting it low, then increase it while at the same time monitoring the realtime performance (mainly CPU) of the target server, to ensure it is not too heavily loaded by the data extraction tasks. |
| extract.enableScheduledExecution | true=start an extraction run extractFrequency milliseconds after the previous one finished. false=only run once, then exit |
| lineageExtract.enable | Controls whether to extract lineage info or not. true/false |
| lineageExtract.exportDir | Directory where lineage files should be stored. |
| lineageExtract.maxLengthDiscriminator | Max characters of discriminator field (=source or destination of data) to store in per-app lineage disk file |
| lineageExtract.maxLengthStatement | Max characters of statement field (e.g. SQL statement) to store in per-app lineage disk file |
| scriptExtract.enable | Controls whether load scripts are extracted to text files or not. true/false |
| scriptExtract.exportDir | Directory where script files will be stored. |
| dataConnectionExtract.enable | Controls whether data connections are extracted to JSON file not. true/false |
| dataConnectionExtract.exportDir | Directory where data connections JSON file will be stored. |
| appFilter.appNameExact | List of apps for which lineage and/or load scripts should be extracted. An exact match on app name is done. |
| appFilter.appId | App ids for which lineage and/or load scripts should be extracted. |
| appFilter.appTag | Lineage and/or load scripts will be extracted for apps with these tags set. |
| configEngine.engineVersion | Version of the Qlik Sense engine running on the target server. Version 12.612.0 should work with any Qlik Sense server from 2020 February and later. |
| configEngine.host | Host name, fully qualified domain name (=FQDN) or IP address of Qlik Sense Enterprise server where Qlik Engine Service (QES) is running. |
| configEngine.port | Should be 4747, unless configured otherwise in the QMC. |
| configEngine.useSSL | Set to true if https is used to communicate with the engine API. |
| configEngine.headers.X-Qlik-User | Sense user directory and user to be used when connecting to the engine API. `UserDirectory=Internal;UserId=sa_repository` is a system account. |
| configEngine.rejectUnauthorized | If set to true, strict checking will be done with respect to ssl certificates etc when connecting to the engine API. |
| configQRS.authentication | Method to authenticate with Qlik Repository Service. Valid options are: `certificates`. |
| configQRS.host | Host name, fully qualified domain name (=FQDN) or IP address of Qlik Sense Enterprise server where Qlik Repository Service (QRS) is running. |
| configQRS.port | Should be 4242, unless configured otherwise in the QMC. |
| configQRS.useSSL | Set to true if https is used to communicate with the repository API. | |
| configQRS.headers.X-Qlik-User | Sense user directory and user to be used when connecting to the engine API. `UserDirectory=Internal;UserId=sa_repository` is a system account. |
| cert.clientCerCA | Root certificate, as exported from the QMC |
| cert.clientCert | Client certificate, as exported from the QMC |
| cert.clientCertKey | Client certificate key, as exported from the QMC |

### App filters

All apps will be processed (=lineage and/or load scripts extracted ) if no app filters at all are set in the config file.

## Logging

Console logs are always enabled, with configurable logging level (in the YAML config file).  

Logging to disk files can be turned on/off via the YAML config file.

Log files on disk are rotated daily. They are kept for 30 days, after which the one(s) older than 30 days are deleted.

## Parallel extraction of lineage data

Lineage data is stored within each Sense app.  
Each app from which lineage should be extracted must therefore be accessed.

The obvious approach is to get lineage data from one app, then move on to the next app.  
This can take a long time on servers with thousands of apps though, Butler Spyglass therefore offers parallel extraction of lineage data.  
Some settings in the config file offer fine-tuning of the extraction process:

- `ButlerSpyglass.extract.concurrentTasks` controls how many apps will be processed in parallel.
- `ButlerSpyglass.extract.itemInterval` controls how long a pause there will be before starting processing of another app.
- `ButlerSpyglass.extract.itemTimeout` is the timeout after which Butler Spyglass will give up for a specific app.

An error will occur if lineage or load script for some reason cannot be extracted for an app.

Butler Spyglass keeps track of the *ratio* of successful extracts.  
For example, the following text in the log means that all (100%) extracts have so far been successful:

    Extracting metadata (#5, overall success rate 100%): fc90c7f0-f498-4780-8864-2f78f449d9e9 <<>> ✅ Qlik help pages

If the number is below 100% it means that one or more lineage/load script extracts failed.  
There should be some info in the logs about which apps were affected and maybe also clues to what happened.

## Running Butler Spyglass

There is no installer, just download the binary for your OS from the [releases page](https://github.com/ptarmiganlabs/butler-spyglass/releases).

Then edit the config file as needed (there is a template config file [here](https://github.com/ptarmiganlabs/butler-spyglass/blob/master/config/production-template.yaml)).  
Place the config file in the `config` subdirectory in the directory where Butler Spyglass was started.  
For example, if `butler-spyglass.exe` is stored in `d:\tools\butler-spyglass`, the config file should be stored in `d:\tools\butler-spyglass\config`.

You must also set the NODE_ENV environment variable to the name of the config file.  
For example, if your config file is `my-config-file.yaml` the NODE_ENV environment variable should be set to `my-config-file`.  
Butler Spyglass uses that variable to determine where to look for the config file.

### Run from command line

The tree structure looks like this:

```powershell
tree /F
```

```
Folder PATH listing
Volume serial number is ....-....
C:.
│   butler-spyglass.exe
│
└───config
        production.yaml
```

The `NODE_ENV` environment variable is set to `production` and the config file is called `production.yaml`.  
In this example the certificates are stored elsewhere (not in a subfolder of the current folder). That's fine as long as the paths are correct.

```powershell
type .\config\production.yaml
```

```
---
ButlerSpyglass:
  # Logging configuration
  logLevel: info                    # Log level. Possible log levels are silly, debug, verbose, info, warn, error
  fileLogging: true                 # true/false to enable/disable logging to disk file
  logDirectory: ./log               # Subdirectory where log files are stored. Either absolute path or relative to where Butler Spyglass was started

  # Extract configuration
  extract:
    frequency: 60000000             # Time between extraction runs. Milliseconds
    itemInterval: 250               # Time between requests to the engine API. Milliseconds
    itemTimeout: 15000              # Timeout for calls to the engine API. Milliseconds
    concurrentTasks: 3              # Simultaneous calls to the engine API. Example: If set to 3, this means 3 calls will be done at the same time, every extractItemInterval milliseconds.
    enableScheduledExecution: false # true=start an extraction run extractFrequency milliseconds after the previous one finished. false=only run once, then exit

  lineageExtract:
    enable: true                    # Should data lineage files be created?
    exportDir: ./out/lineage        # Directory where data lineage files will be stored.
    maxLengthDiscriminator: 1000    # Max characters of discriminator field (=source or destination of data) to store in per-app lineage disk file
    maxLengthStatement: 1000        # Max characters of statemenf field (e.g. SQL statement) to store in per-app lineage disk file

  scriptExtract:
    enable: true                    # Should app load scripts be saved to files?
    exportDir: ./out/script         # Directory where load script files will be stored.

  dataConnectionExtract:
    enable: true                    # Should data connections definitions be saved to files? One JSON file with all data connections will be created.
    exportDir: ./out/dataconnection # Directory where data connection JSON definitions file will be stored.

  # Filter out a selection of apps for which lineage and/or load scripts should be extracted.
  # Filters are additive.
  # If no filters are specified lineage/script will be extracted for all apps in the Sense server.
  appFilter:
    appNameExact:                   # Apps for which lineage/script should be extract. Exact matches are done on app name. 
      - User retention
      - Butler 8.4 demo app
    appId:                          # App IDs for which lineage/script should be extracted.
      - d1ace221-b80e-4754-98ea-3d0a9ebc9632
      - bf4cbb34-cd3c-4fc4-b69d-6fa61d5a270e
    appTag:                         # Lineage/script will be extracted for apps having these tags set.
      - Test data
      - apiCreated
      
  configEngine:
    engineVersion: 12.612.0         # Qlik Associative Engine version to use with Enigma.js. ver 12.612.0 works with Feb 2020 and later
    host: 192.168.100.109
    port: 4747
    useSSL: true
    headers:
      X-Qlik-User: UserDirectory=Internal;UserId=sa_repository
    rejectUnauthorized: false

  configQRS:
    authentication: certificates
    host: 192.168.100.109
    port: 4242
    useSSL: true
    headers:
      X-Qlik-User: UserDirectory=Internal;UserId=sa_repository

  # Certificates to use when connecting to Sense. Get these from the Certificate Export in QMC.
  cert:
    clientCert: C:\tools\ctrl-q\cert\client.pem
    clientCertKey: C:\tools\ctrl-q\cert\client_key.pem
    clientCertCA: C:\tools\ctrl-q\cert\root.pem
```

Now let's run Butler Spyglass itself:

```powershell
.\butler-spyglass.exe
```

```powershell
2023-03-10T17:16:57.144Z info: --------------------------------------
2023-03-10T17:16:57.144Z info: | butler-spyglass
2023-03-10T17:16:57.144Z info: |
2023-03-10T17:16:57.144Z info: | Version    : 2.0.1
2023-03-10T17:16:57.144Z info: | Log level  : info
2023-03-10T17:16:57.144Z info: |
2023-03-10T17:16:57.144Z info: --------------------------------------
2023-03-10T17:16:57.144Z info:
2023-03-10T17:16:57.144Z info: Extracting metadata from server: 192.168.100.109
2023-03-10T17:16:57.144Z info: Data linage files will be stored in                : ./out/lineage
2023-03-10T17:16:57.144Z info: Load script files will be stored in                : ./out/script
2023-03-10T17:16:57.144Z info: Data connection definitions files will be stored in: ./out/dataconnection
2023-03-10T17:16:57.160Z info: --------------------------------------
2023-03-10T17:16:57.160Z info: Extraction run started
2023-03-10T17:16:57.284Z info: Done writing data connection metadata to disk
2023-03-10T17:16:57.660Z info: Number of apps on server: 337
2023-03-10T17:16:57.675Z info: Extracting metadata (#1, overall success rate 0%): 9e15c449-6269-4a0b-a51a-afbda794bce2 <<>> 🔑 Butler Auth
2023-03-10T17:16:57.675Z info: Extracting metadata (#2, overall success rate 0%): b34a8081-ca65-4005-8a93-5daf2d6b7364 <<>> 📨 Butler
2023-03-10T17:16:57.675Z info: Extracting metadata (#3, overall success rate 0%): 8873183c-a45d-412e-b718-d3365af58706 <<>> 🏆 Butler Control-Q
2023-03-10T17:16:58.364Z info: Extracting metadata (#4, overall success rate 100%): 7b797bd9-8354-4d00-a4d1-2d50c74c92b3 <<>> 🏆 Butler Control-Q
2023-03-10T17:16:58.364Z info: Extracting metadata (#5, overall success rate 100%): fc90c7f0-f498-4780-8864-2f78f449d9e9 <<>> ✅ Qlik help pages
2023-03-10T17:16:58.378Z info: Extracting metadata (#6, overall success rate 100%): 874369dd-cee1-431b-b9fd-22087382c3c9 <<>> ⚠️Butler SOS
2023-03-10T17:16:58.988Z info: Extracting metadata (#7, overall success rate 100%): a5f868ca-60ff-4df6-93e9-2c45577fe703 <<>> Web site analytics(1)
...
...
```

If `ButlerSpyglass.enableScheduledExecution` in the config file is set to `true` Butler Spyglass will keep running and do a data lineage extract run every `ButlerSpyglass.extractFrequency` milliseconds.

### Run using Docker

Using Docker is convenient and easy if you have an existing Docker or Kubernetes environment and know how to use those tools.  
A few things to keep in mind though:

- The NODE_ENV variable in the `docker-compose.yml` file controls what config file will be used. If NODE_ENV is set to *production*, the file `./config/production.yaml` will be used.
- The output directories defined in the `./config/production.yaml` file must match the volume mapping in the docker-compose.yml file.  
  I.e. if the config file defines the output directories as `./out/lineage` and `./out/script`, the docker-compose file must map the containers /nodeapp/out to an existing directory on the Docker host, for example

    `./out:/nodeapp/out`.

Looking at the directory structure and the config files, they could look as follows:

*Directory structure*:

    .
    ├── config
    │   ├── certificate
    │   │   ├── client.pem
    │   │   ├── client_key.pem
    │   │   └── root.pem
    │   └── production.yaml
    ├── docker-compose.yml
    └── out
       ├── dataconnection
       ├── lineage
       └── script

*config/production.yaml*:

```yaml
---
ButlerSpyglass:
  # Logging configuration
  logLevel: info              # Log level. Possible log levels are silly, debug, verbose, info, warn, error
  fileLogging: true           # true/false to enable/disable logging to disk file
  logDirectory: logs          # Subdirectory where log files are stored

  # Extract configuration
  extractFrequency: 60000     # Time between extraction runs. Milliseconds
  extractItemInterval: 500    # Time between requests to the engine API. Milliseconds
  extractItemTimeout: 5000    # Timeout for calls to the engine API. Milliseconds
  concurrentTasks: 1          # Simultaneous calls to the engine API. Example: If set to 3, this means 3 calls will be done at the same time, every extractItemInterval milliseconds.
  enableScheduledExecution: true  # true=start an extraction run extractFrequency milliseconds after the previous one finished. false=only run once, then exit

  lineageExtract:
    enable: true                  # Should data lineage files be created?
    exportDir: ./out/lineage      # Directory where data lineage files will be stored.
    maxLengthDiscriminator: 1000  # Max characters of discriminator field (=source or destination of data) to store in per-app lineage disk file
    maxLengthStatement: 1000      # Max characters of statemenf field (e.g. SQL statement) to store in per-app lineage disk file

  scriptExtract:
    enable: true                  # Should app load scripts be saved to files?
    exportDir: ./out/script       # Directory where load script files will be stored.

  dataConnectionExtract:
    enable: true                      # Should data connections definitions be saved to files? One JSON file with all data connections will be created.
    exportDir: ./out/dataconnection   # Directory where data connection JSON definitions file will be stored.

  # Filter out a selection of apps for which lineage and/or load scripts should be extracted.
  # Filters are additive.
  # If no filters are specified lineage/script will be extracted for all apps in the Sense server.
  appFilter:
    appNameExact:                   # Apps for which lineage/script should be extract. Exact matches are done on app name. 
      - User retention
      - Butler 8.4 demo app
    appId:                          # App IDs for which lineage/script should be extracted.
      - d1ace221-b80e-4754-98ea-3d0a9ebc9632
      - bf4cbb34-cd3c-4fc4-b69d-6fa61d5a270e
    appTag:                         # Lineage/script will be extracted for apps having these tags set.
      - Test data
      - apiCreated      

  configEngine:
    engineVersion: 12.612.0         # Qlik Associative Engine version to use with Enigma.js. ver 12.612.0 works with Feb 2020 and later 
    host: sense.ptarmiganlabs.com
    port: 4747
    useSSL: true
    headers:
      X-Qlik-User: UserDirectory=Internal;UserId=sa_repository
    rejectUnauthorized: false

  configQRS: 
    authentication: certificates
    host: sense.ptarmiganlabs.com
    port: 4242
    useSSL: true
    headers:
      X-Qlik-User: UserDirectory=Internal;UserId=sa_repository

  # Certificates to use when connecting to Sense. Get these from the Certificate Export in QMC.
  cert:
    ca: /nodeapp/config/certificate/root.pem
    cert: /nodeapp/config/certificate/client.pem
    key: /nodeapp/config/certificate/client_key.pem
    rejectUnauthorized: false
```

*docker-compose.yml*:

```yaml
version: '3.3'
services:
  butler-spyglass:
    image: ptarmiganlabs/butler-spyglass:latest
    container_name: butler-spyglass
    restart: always
    volumes:
      # Make config file and output directories are accessible outside of container
      - "./config:/nodeapp/config"
      - "./out:/nodeapp/out"
    environment:
      - "NODE_ENV=production"
    logging:
      driver: json-file
```

## Output files

The output directories are emptied every time Butler Spyglass is started.  
No need to manually clear them thus.

### Data lineage output files

The data lineage information is saved as JSON and CSV files - for each app.  
The file names are `<app id>.csv` and `<app id>.json`:

```powershell
PS C:\tools\butler-spyglass> dir .\out\lineage\


    Directory: C:\tools\butler-spyglass\out\lineage


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        10/03/2023     18:21            101 1254a8c6-f804-4d29-b386-7aab07f512f9.csv
-a----        10/03/2023     18:21            151 1254a8c6-f804-4d29-b386-7aab07f512f9.json
-a----        10/03/2023     18:21            105 1a98ef8e-dd98-442b-8b76-58de43b5cbfa.csv
-a----        10/03/2023     18:21            155 1a98ef8e-dd98-442b-8b76-58de43b5cbfa.json
-a----        10/03/2023     18:21             92 2fa09446-86fa-495c-b803-025c4c8ebc23.csv
-a----        10/03/2023     18:21             96 2fa09446-86fa-495c-b803-025c4c8ebc23.json
-a----        10/03/2023     18:21            112 aa5fde91-f8c0-4127-9eb1-452b31355e8e.csv
-a----        10/03/2023     18:21            162 aa5fde91-f8c0-4127-9eb1-452b31355e8e.json
...
```

Each lineage file may contain zero or more rows, each representing a data source or destination that the app uses.
Everything is included - even inline tables, resident loads, writing to QVDs etc.

This richness can be a problem though. If an inline table contains a thousand rows, all those rows will be returned as part of the lineage data.
That's where the ```maxLengthDiscriminator``` config option (in the config YAML file) comes in handy. It makes it possible to set a limit to how many characters should be included for each row of lineage data.
The setting is global for all apps, and applies to all rows of lineage data extracted from Sense.

Here is an example lineage file. Note that both QVDs, SQL statements and inline tables are included in the lineage data. 

    AppId,AppName,Discriminator,Statement
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,Healthcheck;,"RestConnectorMasterTable:
        SQL SELECT 
            ""col_1""
        FROM CSV (header off, delimiter "","", quote """""""") ""CSV_source""
        WITH CONNECTION(Url ""http://healthcheck.ptarmiganlabs.net:8000/ping/10a887bf-4580-4891-9c6f-2affbd380f16"")"
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,INLINE;,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,RESIDENT __cityAliasesBase;,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,RESIDENT __cityGeoBase;,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,RESIDENT __countryAliasesBase;,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,RESIDENT __countryGeoBase;,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,\\fileshare1\testdata\meetupcom\categories.csv;,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,\\pro\sensedata\staticcontent\appcontent\c840670c-7178-4a5e-8409-ba2da69127e2\cityaliases.qvd;,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,\\pro\sensedata\staticcontent\appcontent\c840670c-7178-4a5e-8409-ba2da69127e2\citygeo.qvd;,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,\\pro\sensedata\staticcontent\appcontent\c840670c-7178-4a5e-8409-ba2da69127e2\countryaliases.qvd;,
    c840670c-7178-4a5e-8409-ba2da69127e2,Meetup.com,\\pro\sensedata\staticcontent\appcontent\c840670c-7178-4a5e-8409-ba2da69127e2\countrygeo.qvd;,

### Load script output files

Each app's load script is also stored as its own file, with the app ID as the file name:

```powershell
PS C:\tools\butler-spyglass> dir .\out\script\


    Directory: C:\tools\butler-spyglass\out\script


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        10/03/2023     18:21           6470 1254a8c6-f804-4d29-b386-7aab07f512f9.qvs
-a----        10/03/2023     18:21           3170 1a98ef8e-dd98-442b-8b76-58de43b5cbfa.qvs
-a----        10/03/2023     18:21           3190 2fa09446-86fa-495c-b803-025c4c8ebc23.qvs
-a----        10/03/2023     18:21           1677 aa5fde91-f8c0-4127-9eb1-452b31355e8e.qvs
...
```

```powershell
PS C:\tools\butler-spyglass> type .\out\script\aa5fde91-f8c0-4127-9eb1-452b31355e8e.qvs
///$tab Main
SET ThousandSep=',';
SET DecimalSep='.';
SET MoneyThousandSep=',';
SET MoneyDecimalSep='.';
SET MoneyFormat='$#,##0.00;-$#,##0.00';
SET TimeFormat='h:mm:ss TT';
SET DateFormat='M/D/YYYY';
SET TimestampFormat='M/D/YYYY h:mm:ss[.fff] TT';
SET FirstWeekDay=6;
SET BrokenWeeks=1;
SET ReferenceDay=0;
SET FirstMonthOfYear=1;
SET CollationLocale='en-US';
SET CreateSearchIndexOnReload=1;
SET MonthNames='Jan;Feb;Mar;Apr;May;Jun;Jul;Aug;Sep;Oct;Nov;Dec';
SET LongMonthNames='January;February;March;April;May;June;July;August;September;October;November;December';
SET DayNames='Mon;Tue;Wed;Thu;Fri;Sat;Sun';
SET LongDayNames='Monday;Tuesday;Wednesday;Thursday;Friday;Saturday;Sunday';
SET NumericalAbbreviation='3:k;6:M;9:G;12:T;15:P;18:E;21:Z;24:Y;-3:m;-6:Î¼;-9:n;-12:p;-15:f;-18:a;-21:z;-24:y';

///$tab Test data 1
Characters:
Load Chr(RecNo()+Ord('A')-1) as Alpha, RecNo() as Num autogenerate 26;

ASCII:
Load
 if(RecNo()>=65 and RecNo()<=90,RecNo()-64) as Num,
 Chr(RecNo()) as AsciiAlpha,
 RecNo() as AsciiNum
autogenerate 255
 Where (RecNo()>=32 and RecNo()<=126) or RecNo()>=160 ;

Transactions:
Load
 TransLineID,
 TransID,
 mod(TransID,26)+1 as Num,
 Pick(Ceil(3*Rand1),'A','B','C') as Dim1,
 Pick(Ceil(6*Rand1),'a','b','c','d','e','f') as Dim2,
 Pick(Ceil(3*Rand()),'X','Y','Z') as Dim3,
 Round(1000*Rand()*Rand()*Rand1) as Expression1,
 Round(  10*Rand()*Rand()*Rand1) as Expression2,
 Round(Rand()*Rand1,0.00001) as Expression3;
Load
 Rand() as Rand1,
 IterNo() as TransLineID,
 RecNo() as TransID
Autogenerate 1000
 While Rand()<=0.5 or IterNo()=1;

 Comment Field Dim1 With "This is a field comment";
```

### Data connections output files

All data connections for the entire Qlik Sense server are exported to JSON and CSV files:

```powershell
PS C:\tools\butler-spyglass> dir .\out\dataconnection\


    Directory: C:\tools\butler-spyglass\out\dataconnection


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        10/03/2023     18:21          32953 dataconnections.csv
-a----        10/03/2023     18:21          52468 dataconnections.json
```

## Analysing the generated files

There are currently no analysis apps included in this project.
This should be fairly easy to create though. The data lineage CSV files can be loaded into a Sense app and from there be made available for analysis.

The load script .qvs files could be zipped into a daily archive by means of a scheduled task, using the standard OS scheduler.

Feel free to contribute with good analysis apps - pull requests are always welcome!

## Security / Disclosure

If you discover any important bug with Butler Spyglass that may pose a security problem, please disclose it confidentially to security@ptarmiganlabs.com first, so that it can be assessed and hopefully fixed prior to being exploited. Please do not raise GitHub issues for security-related doubts or problems.
