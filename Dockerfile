FROM osixia/openldap:stable

ENV SCHEMA_PATH=/container/service/slapd/assets/config/bootstrap/schema/custom/
ENV DATA_PATH=/container/service/slapd/assets/config/bootstrap/ldif/custom/

COPY ./data/ ${DATA_PATH}
COPY ./schema/ ${SCHEMA_PATH}

RUN /container/tool/run -p --copy-service --keep-startup-env
#RUN	/container/tool/run --run-only process --copy-service

RUN cd ${DATA_PATH} && rm -Rf *.ldif

#ENTRYPOINT [ "/container/tool/run --run-only finish --copy-service" ]

