#!/bin/bash

if [[ $GENERATE_DATA == 'true' || $GENERATE_DATA == true ]]
then
	npm ci
	mkdir data
	touch export.ldif
	node generateLdif.js \
		--basePath "${BASE_PATH}"
		--numberOfSchools $NUMBER_OF_SCHOOLS \
		--numberOfClasses $NUMBER_OF_CLASSES \
		--numberOfUsers $NUMBER_OF_USERS \
		--percentageOfCollision $PERCENTAGE_OF_COLLISION \
		> data/export.ldif
else
	mv pre_data data
fi