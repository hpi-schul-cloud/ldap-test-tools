FROM node:lts AS builder

WORKDIR /ldif_build

COPY ./generateLdif.js .
COPY ./package.json .
COPY ./package-lock.json .
COPY ./docker_build_stage.sh .
COPY ./data ./pre_data/
COPY ./schema/ ./schema/

ARG GENERATE_DATA=false
ARG NUMBER_OF_SCHOOLS=19
ARG NUMBER_OF_USERS=1235
ARG NUMBER_OF_CLASSES=17
ARG PERCENTAGE_OF_COLLISION=0
ARG BASE_PATH=dc=example, dc=org

RUN chmod 750 ./docker_build_stage.sh && ./docker_build_stage.sh


FROM osixia/openldap:stable

ENV SCHEMA_PATH=/container/service/slapd/assets/config/bootstrap/schema/custom/
ENV DATA_PATH=/container/service/slapd/assets/config/bootstrap/ldif/custom/

COPY --from=builder /ldif_build/data ${DATA_PATH}
COPY --from=builder /ldif_build/schema/ ${SCHEMA_PATH}
ARG LDAP_ADMIN_PASSWORD="admin"

