FROM nodered/node-red:latest-18

# install our files, install required npm packages
WORKDIR /data
USER node-red
COPY --chown=node-red:node-red assets/data/. .
# XXX: assets/npm_manifest is created by a bash script that runs on the host
COPY --chown=node-red:node-red assets/npm_manifest npm_manifest
RUN for file in `cat npm_manifest`; do yarn add @dataflow-designer/"$file" ; done
RUN rm npm_manifest
RUN find . -name ".gitkeep" -exec rm -f {} \;

# back to the original directory and entrypoint
WORKDIR /usr/src/node-red
ENTRYPOINT ["./entrypoint.sh"]