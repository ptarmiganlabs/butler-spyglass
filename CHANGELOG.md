# Changelog

## [2.0.4](https://github.com/ptarmiganlabs/butler-spyglass/compare/butler-spyglass-v2.0.3...butler-spyglass-v2.0.4) (2023-03-12)


### Build pipeline

* Failing Docker image build ([ff8d030](https://github.com/ptarmiganlabs/butler-spyglass/commit/ff8d030799f9d9e2faa7a3eb2bfb8319dc0c83d3))

## [2.0.3](https://github.com/ptarmiganlabs/butler-spyglass/compare/butler-spyglass-v2.0.2...butler-spyglass-v2.0.3) (2023-03-12)


### Build pipeline

* Add Docker healthcheck ([ea0518e](https://github.com/ptarmiganlabs/butler-spyglass/commit/ea0518e3d2771fb4a51ab0a9d3d8d065ceec939a))
* Add missing Docker build files ([ea0518e](https://github.com/ptarmiganlabs/butler-spyglass/commit/ea0518e3d2771fb4a51ab0a9d3d8d065ceec939a)), closes [#23](https://github.com/ptarmiganlabs/butler-spyglass/issues/23)

## [2.0.2](https://github.com/ptarmiganlabs/butler-spyglass/compare/butler-spyglass-v2.0.1...butler-spyglass-v2.0.2) (2023-03-12)


### Documentation

* Add status badge to readme file ([f060f9a](https://github.com/ptarmiganlabs/butler-spyglass/commit/f060f9a4a71a8e6be4eec67fcaef9c8b39ea1337))
* Re-written most of docs wrt 2.x release ([1d7cb6d](https://github.com/ptarmiganlabs/butler-spyglass/commit/1d7cb6d353c6fc8ebc7a47d05c0e63080a094ef3))


### Build pipeline

* Disable MQTT messages from Docker build workflow ([f6b1712](https://github.com/ptarmiganlabs/butler-spyglass/commit/f6b17123b08e1566c20c2149add37fa2fe4954a8))

## [2.0.1](https://github.com/ptarmiganlabs/butler-spyglass/compare/butler-spyglass-v2.0.0...butler-spyglass-v2.0.1) (2023-03-10)


### Build pipeline

* Add missing VirusTotal scan during build ([ff3741a](https://github.com/ptarmiganlabs/butler-spyglass/commit/ff3741aea7a55e0182e7db822b069d19a77fb74d))
* Revert to automatic version numbering ([6ab25db](https://github.com/ptarmiganlabs/butler-spyglass/commit/6ab25db8304022cebd728987f29fae6e96d27507))

## [2.0.0](https://github.com/ptarmiganlabs/butler-spyglass/compare/butler-spyglass-v2.0.0...butler-spyglass-v2.0.0) (2023-03-10)


### ⚠ BREAKING CHANGES

* New config file structure. Not backwards compatible!
* Update config file format

### Features

* Create pre-built binaries for Windows, macOS and Linux ([2be9842](https://github.com/ptarmiganlabs/butler-spyglass/commit/2be9842aa160a5f68c988e316d91bfc26bbc8f1b)), closes [#69](https://github.com/ptarmiganlabs/butler-spyglass/issues/69)
* Improved bug reporting & feature suggestion ([1122f27](https://github.com/ptarmiganlabs/butler-spyglass/commit/1122f27084e4504e23a8f512ce87db0fa977dd8c))


### Bug Fixes

* Fix broken build pipeline ([db5cc7d](https://github.com/ptarmiganlabs/butler-spyglass/commit/db5cc7d17a8ca62a2a1693a6be2384ab16e3a122))
* New config file structure. Not backwards compatible! ([9885d68](https://github.com/ptarmiganlabs/butler-spyglass/commit/9885d68e19eb027bc74976e93e0cd22cdf22eabe))
* package.json & package-lock.json to reduce vulnerabilities ([40845c7](https://github.com/ptarmiganlabs/butler-spyglass/commit/40845c7881813c7c69d8425564b1e8041a5c6d6b))
* Update config file format ([9b45d47](https://github.com/ptarmiganlabs/butler-spyglass/commit/9b45d47b53ef54f4e20738d5075bad7aeee872ae))


### Refactoring

* Code cleanup ([5c1901b](https://github.com/ptarmiganlabs/butler-spyglass/commit/5c1901b9e20fd0312adef0cd66d76f74f7d439ad))


### Documentation

* Add BNF definition file ([d17a74f](https://github.com/ptarmiganlabs/butler-spyglass/commit/d17a74fae155b4a00cc721879df1b5288591b358))
* Update sample docker-compose file ([3f2f0b5](https://github.com/ptarmiganlabs/butler-spyglass/commit/3f2f0b57ada55bcd7f069a444cccb4efea935cec))


### Miscellaneous

* **deps:** update docker/build-push-action action to v4 ([8b41abf](https://github.com/ptarmiganlabs/butler-spyglass/commit/8b41abf113ff365bea3f7f83677596806737f538))
* **deps:** Updated dependencies ([fae3a34](https://github.com/ptarmiganlabs/butler-spyglass/commit/fae3a34b4010edace7d20eddaaca3d26f76316c0))
* **master:** release butler-spyglass 2.0.0 ([ea8f2a9](https://github.com/ptarmiganlabs/butler-spyglass/commit/ea8f2a9af2ef68751ffb63acc65bc7f76e34ad97))
* **master:** release butler-spyglass 2.0.0 ([8d836e5](https://github.com/ptarmiganlabs/butler-spyglass/commit/8d836e59967ad582900709544106d64cb3e702b6))
* **master:** release butler-spyglass 2.0.0 ([4fd81bb](https://github.com/ptarmiganlabs/butler-spyglass/commit/4fd81bbe837ba1c9c0ebff6c52e2b922c149838d))
* Update code linting setup ([ab931f0](https://github.com/ptarmiganlabs/butler-spyglass/commit/ab931f0d96cfef8b4edd2ec59f556afae4ced15e))
* Update deps ([a997c72](https://github.com/ptarmiganlabs/butler-spyglass/commit/a997c7258ebb349de7723fd56c653ded4d78126f))


### Build pipeline

* Add Dependabot scanning of source code ([2393cae](https://github.com/ptarmiganlabs/butler-spyglass/commit/2393caeec39df6983ab22d4dad3f4b566691091c))
* Add missing macOS build files ([ec6725a](https://github.com/ptarmiganlabs/butler-spyglass/commit/ec6725aa76270b32ecae06b74c7eb250f7b970d3))
* Add pre-commit scans of source code ([2eb12c5](https://github.com/ptarmiganlabs/butler-spyglass/commit/2eb12c536d9b27710be1d7634137965290a1697c))
* Fix broken macOS build ([ae5217b](https://github.com/ptarmiganlabs/butler-spyglass/commit/ae5217b95d6881eafbd4aa4c7faf4bc6da990557))
* Move build pipeline from drone.io to GitHub Actions ([379dc55](https://github.com/ptarmiganlabs/butler-spyglass/commit/379dc55fa2c464c666db29a03d52f6bcb9f45891))

## [2.0.0](https://github.com/ptarmiganlabs/butler-spyglass/compare/butler-spyglass-v2.0.0...butler-spyglass-v2.0.0) (2023-03-10)


### ⚠ BREAKING CHANGES

* New config file structure. Not backwards compatible!
* Update config file format

### Features

* Create pre-built binaries for Windows, macOS and Linux ([2be9842](https://github.com/ptarmiganlabs/butler-spyglass/commit/2be9842aa160a5f68c988e316d91bfc26bbc8f1b)), closes [#69](https://github.com/ptarmiganlabs/butler-spyglass/issues/69)
* Improved bug reporting & feature suggestion ([1122f27](https://github.com/ptarmiganlabs/butler-spyglass/commit/1122f27084e4504e23a8f512ce87db0fa977dd8c))


### Bug Fixes

* Fix broken build pipeline ([db5cc7d](https://github.com/ptarmiganlabs/butler-spyglass/commit/db5cc7d17a8ca62a2a1693a6be2384ab16e3a122))
* New config file structure. Not backwards compatible! ([9885d68](https://github.com/ptarmiganlabs/butler-spyglass/commit/9885d68e19eb027bc74976e93e0cd22cdf22eabe))
* package.json & package-lock.json to reduce vulnerabilities ([40845c7](https://github.com/ptarmiganlabs/butler-spyglass/commit/40845c7881813c7c69d8425564b1e8041a5c6d6b))
* Update config file format ([9b45d47](https://github.com/ptarmiganlabs/butler-spyglass/commit/9b45d47b53ef54f4e20738d5075bad7aeee872ae))


### Refactoring

* Code cleanup ([5c1901b](https://github.com/ptarmiganlabs/butler-spyglass/commit/5c1901b9e20fd0312adef0cd66d76f74f7d439ad))


### Documentation

* Add BNF definition file ([d17a74f](https://github.com/ptarmiganlabs/butler-spyglass/commit/d17a74fae155b4a00cc721879df1b5288591b358))
* Update sample docker-compose file ([3f2f0b5](https://github.com/ptarmiganlabs/butler-spyglass/commit/3f2f0b57ada55bcd7f069a444cccb4efea935cec))


### Miscellaneous

* **deps:** update docker/build-push-action action to v4 ([8b41abf](https://github.com/ptarmiganlabs/butler-spyglass/commit/8b41abf113ff365bea3f7f83677596806737f538))
* **deps:** Updated dependencies ([fae3a34](https://github.com/ptarmiganlabs/butler-spyglass/commit/fae3a34b4010edace7d20eddaaca3d26f76316c0))
* **master:** release butler-spyglass 2.0.0 ([8d836e5](https://github.com/ptarmiganlabs/butler-spyglass/commit/8d836e59967ad582900709544106d64cb3e702b6))
* **master:** release butler-spyglass 2.0.0 ([4fd81bb](https://github.com/ptarmiganlabs/butler-spyglass/commit/4fd81bbe837ba1c9c0ebff6c52e2b922c149838d))
* Update code linting setup ([ab931f0](https://github.com/ptarmiganlabs/butler-spyglass/commit/ab931f0d96cfef8b4edd2ec59f556afae4ced15e))
* Update deps ([a997c72](https://github.com/ptarmiganlabs/butler-spyglass/commit/a997c7258ebb349de7723fd56c653ded4d78126f))


### Build pipeline

* Add Dependabot scanning of source code ([2393cae](https://github.com/ptarmiganlabs/butler-spyglass/commit/2393caeec39df6983ab22d4dad3f4b566691091c))
* Add missing macOS build files ([ec6725a](https://github.com/ptarmiganlabs/butler-spyglass/commit/ec6725aa76270b32ecae06b74c7eb250f7b970d3))
* Add pre-commit scans of source code ([2eb12c5](https://github.com/ptarmiganlabs/butler-spyglass/commit/2eb12c536d9b27710be1d7634137965290a1697c))
* Move build pipeline from drone.io to GitHub Actions ([379dc55](https://github.com/ptarmiganlabs/butler-spyglass/commit/379dc55fa2c464c666db29a03d52f6bcb9f45891))

## [2.0.0](https://github.com/ptarmiganlabs/butler-spyglass/compare/butler-spyglass-v2.0.0...butler-spyglass-v2.0.0) (2023-03-10)


### ⚠ BREAKING CHANGES

* New config file structure. Not backwards compatible!
* Update config file format

### Features

* Create pre-built binaries for Windows, macOS and Linux ([2be9842](https://github.com/ptarmiganlabs/butler-spyglass/commit/2be9842aa160a5f68c988e316d91bfc26bbc8f1b)), closes [#69](https://github.com/ptarmiganlabs/butler-spyglass/issues/69)
* Improved bug reporting & feature suggestion ([1122f27](https://github.com/ptarmiganlabs/butler-spyglass/commit/1122f27084e4504e23a8f512ce87db0fa977dd8c))


### Bug Fixes

* Fix broken build pipeline ([db5cc7d](https://github.com/ptarmiganlabs/butler-spyglass/commit/db5cc7d17a8ca62a2a1693a6be2384ab16e3a122))
* New config file structure. Not backwards compatible! ([9885d68](https://github.com/ptarmiganlabs/butler-spyglass/commit/9885d68e19eb027bc74976e93e0cd22cdf22eabe))
* package.json & package-lock.json to reduce vulnerabilities ([40845c7](https://github.com/ptarmiganlabs/butler-spyglass/commit/40845c7881813c7c69d8425564b1e8041a5c6d6b))
* Update config file format ([9b45d47](https://github.com/ptarmiganlabs/butler-spyglass/commit/9b45d47b53ef54f4e20738d5075bad7aeee872ae))


### Refactoring

* Code cleanup ([5c1901b](https://github.com/ptarmiganlabs/butler-spyglass/commit/5c1901b9e20fd0312adef0cd66d76f74f7d439ad))


### Build pipeline

* Add Dependabot scanning of source code ([2393cae](https://github.com/ptarmiganlabs/butler-spyglass/commit/2393caeec39df6983ab22d4dad3f4b566691091c))
* Add pre-commit scans of source code ([2eb12c5](https://github.com/ptarmiganlabs/butler-spyglass/commit/2eb12c536d9b27710be1d7634137965290a1697c))
* Move build pipeline from drone.io to GitHub Actions ([379dc55](https://github.com/ptarmiganlabs/butler-spyglass/commit/379dc55fa2c464c666db29a03d52f6bcb9f45891))


### Documentation

* Add BNF definition file ([d17a74f](https://github.com/ptarmiganlabs/butler-spyglass/commit/d17a74fae155b4a00cc721879df1b5288591b358))
* Update sample docker-compose file ([3f2f0b5](https://github.com/ptarmiganlabs/butler-spyglass/commit/3f2f0b57ada55bcd7f069a444cccb4efea935cec))


### Miscellaneous

* **deps:** update docker/build-push-action action to v4 ([8b41abf](https://github.com/ptarmiganlabs/butler-spyglass/commit/8b41abf113ff365bea3f7f83677596806737f538))
* **deps:** Updated dependencies ([fae3a34](https://github.com/ptarmiganlabs/butler-spyglass/commit/fae3a34b4010edace7d20eddaaca3d26f76316c0))
* **master:** release butler-spyglass 2.0.0 ([4fd81bb](https://github.com/ptarmiganlabs/butler-spyglass/commit/4fd81bbe837ba1c9c0ebff6c52e2b922c149838d))
* Update code linting setup ([ab931f0](https://github.com/ptarmiganlabs/butler-spyglass/commit/ab931f0d96cfef8b4edd2ec59f556afae4ced15e))
* Update deps ([a997c72](https://github.com/ptarmiganlabs/butler-spyglass/commit/a997c7258ebb349de7723fd56c653ded4d78126f))

## 2.0.0 (2023-03-10)


### ⚠ BREAKING CHANGES

* New config file structure. Not backwards compatible!
* Update config file format

### Features

* Create pre-built binaries for Windows, macOS and Linux ([2be9842](https://github.com/ptarmiganlabs/butler-spyglass/commit/2be9842aa160a5f68c988e316d91bfc26bbc8f1b)), closes [#69](https://github.com/ptarmiganlabs/butler-spyglass/issues/69)
* Improved bug reporting & feature suggestion ([1122f27](https://github.com/ptarmiganlabs/butler-spyglass/commit/1122f27084e4504e23a8f512ce87db0fa977dd8c))


### Bug Fixes

* New config file structure. Not backwards compatible! ([9885d68](https://github.com/ptarmiganlabs/butler-spyglass/commit/9885d68e19eb027bc74976e93e0cd22cdf22eabe))
* package.json & package-lock.json to reduce vulnerabilities ([40845c7](https://github.com/ptarmiganlabs/butler-spyglass/commit/40845c7881813c7c69d8425564b1e8041a5c6d6b))
* Update config file format ([9b45d47](https://github.com/ptarmiganlabs/butler-spyglass/commit/9b45d47b53ef54f4e20738d5075bad7aeee872ae))


### Refactoring

* Code cleanup ([5c1901b](https://github.com/ptarmiganlabs/butler-spyglass/commit/5c1901b9e20fd0312adef0cd66d76f74f7d439ad))


### Miscellaneous

* **deps:** update docker/build-push-action action to v4 ([8b41abf](https://github.com/ptarmiganlabs/butler-spyglass/commit/8b41abf113ff365bea3f7f83677596806737f538))
* **deps:** Updated dependencies ([fae3a34](https://github.com/ptarmiganlabs/butler-spyglass/commit/fae3a34b4010edace7d20eddaaca3d26f76316c0))
* Update code linting setup ([ab931f0](https://github.com/ptarmiganlabs/butler-spyglass/commit/ab931f0d96cfef8b4edd2ec59f556afae4ced15e))
* Update deps ([a997c72](https://github.com/ptarmiganlabs/butler-spyglass/commit/a997c7258ebb349de7723fd56c653ded4d78126f))


### Build pipeline

* Add Dependabot scanning of source code ([2393cae](https://github.com/ptarmiganlabs/butler-spyglass/commit/2393caeec39df6983ab22d4dad3f4b566691091c))
* Add pre-commit scans of source code ([2eb12c5](https://github.com/ptarmiganlabs/butler-spyglass/commit/2eb12c536d9b27710be1d7634137965290a1697c))
* Move build pipeline from drone.io to GitHub Actions ([379dc55](https://github.com/ptarmiganlabs/butler-spyglass/commit/379dc55fa2c464c666db29a03d52f6bcb9f45891))


### Documentation

* Add BNF definition file ([d17a74f](https://github.com/ptarmiganlabs/butler-spyglass/commit/d17a74fae155b4a00cc721879df1b5288591b358))
* Update sample docker-compose file ([3f2f0b5](https://github.com/ptarmiganlabs/butler-spyglass/commit/3f2f0b57ada55bcd7f069a444cccb4efea935cec))
