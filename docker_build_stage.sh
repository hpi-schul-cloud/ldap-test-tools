#!/bin/bash

if [[ $GENERATE_DATA == 'true' || $GENERATE_DATA == true ]]
then
	npm ci
	mkdir data
	touch export.ldif
	node generateLdif.js \
		--numberOfSchools $NUMBER_OF_SCHOOLS \
		--numberOfClasses $NUMBER_OF_CLASSES \
		--numberOfUsers $NUMBER_OF_USERS \
		--percentageOfCollision $PERCENTAGE_OF_COLLISION \
        --schoolNameBase $SCHOOL_NAME_BASE \
		> data/export.ldif
else
	mv pre_data data
fi