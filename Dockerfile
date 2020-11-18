FROM osixia/openldap:stable

ENV SCHEMA_PATH=/container/service/slapd/assets/config/bootstrap/schema/custom/
ENV DATA_PATH=/container/service/slapd/assets/config/bootstrap/ldif/custom/
ARG LDAP_ADMIN_PASSWORD="Schulcloud1!"

COPY ./data/ ${DATA_PATH}
COPY ./schema/ ${SCHEMA_PATH}

### Read data
# exclude process (-p)
# keep-startup-env speed up the start of the container but maybe prevent from reading envs
RUN /container/tool/run -p --copy-service --keep-startup-env

RUN cd ${DATA_PATH} && rm -Rf *.ldif


