# Change log

## v1.2

* Added configurable extract length (max number of characters) for each row of lineage data.
* Tweaked log messages, making info-level logging more relevant.
* Add possibility to enable/disable scheduled extraction runs. Opens up for using external schedulers (e.g. cron).
* Add configurable logging to disk. If turned on, the log entries shown on the console are also written to disk.

## v1.1

* **Data lineage is saved as one file per app.** Previously all data lineage was saved in a single app.
* Both data lineage and scripts are now saved to disk right after they have been extracted. This reduces the impact of the tool failing half-way through all apps.
* Much improved stability and error handling when app extracts time out or fail.
* Added configurable concurrency, i.e. how many app extracts should be done concurrently.
* Added configurable timeout for app extraction.
* Add configuration for controlling whether lineage data or scripts or both should be extracted from apps.
* Much improved documentation in the [readme file](https://github.com/ptarmiganlabs/butler-spyglass/blob/master/readme.md).

## v1.0

* Exract scripts for all apps in a Qlik Sense Enterprise environment. Scripts are stored as one .qvs file per app.
* Extract data lineage info for all apps. All lineage information is stored in a single .csv file