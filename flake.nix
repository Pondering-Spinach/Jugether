{
  description = "Jugether development environment and OCI deployment images";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ];
      environment = system:
        let pkgs = nixpkgs.legacyPackages.${system};
        in pkgs.buildEnv {
          name = "jugether-tools";
          # better-sqlite3 is built by node-gyp during local npm installs.
          paths = with pkgs; [ nodejs_24 git sqlite yt-dlp python3 gnumake pkg-config stdenv.cc ];
        };
    in {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          lib = pkgs.lib;
          frontend = pkgs.buildNpmPackage {
            pname = "jugether-frontend";
            version = "0.1.0";
            src = ./frontend;
            npmDepsFetcherVersion = 2;
            npmDepsHash = "sha256-LLW4lRtOPRLloIlnWI/HkPgFgMbMimQhOkHyYQO8Ie8=";
            npmFlags = [ "--legacy-peer-deps" ];
            buildPhase = ''
              runHook preBuild
              export FRONTEND_OUT_DIR="$PWD/dist"
              npm run build
              runHook postBuild
            '';
            installPhase = ''
              mkdir -p "$out"
              cp -r dist/. "$out/"
            '';
          };
          backend = pkgs.buildNpmPackage {
            pname = "jugether-backend";
            version = "0.1.0";
            src = ./backend;
            postPatch = ''
              ln -s ${./communication} ../communication
            '';
            npmDepsFetcherVersion = 2;
            npmDepsHash = "sha256-g+pb+KAbV+JA4n6jPNZTKq2LosghPjZr4LRIaq+m8S4=";
            npmFlags = [ "--legacy-peer-deps" ];
            nativeBuildInputs = [ pkgs.makeWrapper ];
            buildPhase = ''
              runHook preBuild
              npm exec tsc -- --noEmit
              runHook postBuild
            '';
            installPhase = ''
              mkdir -p "$out/app/backend/public" "$out/app" "$out/bin"
              cp -r . "$out/app/backend"
              cp -r ${./communication} "$out/app/communication"
              chmod -R u+w "$out/app"
              cp -r ${frontend}/. "$out/app/backend/public/"
              makeWrapper ${pkgs.nodejs_24}/bin/node "$out/bin/jugether" \
                --add-flags "$out/app/backend/node_modules/tsx/dist/cli.mjs" \
                --add-flags "$out/app/backend/index.ts" \
                --run "cd $out/app/backend && ${pkgs.nodejs_24}/bin/node $out/app/backend/node_modules/tsx/dist/cli.mjs db/migrate.ts" \
                --run "cd $out/app/backend"
            '';
          };
          updater = pkgs.writeShellScriptBin "jugether-ytdlp-updater"
            (builtins.replaceStrings [ "@bash@" ] [ "${pkgs.bash}/bin/bash" ]
              (builtins.readFile ./deploy/update-ytdlp-nightly));
          image = pkgs.dockerTools.buildLayeredImage {
            name = "jugether";
            tag = "latest";
            contents = [ backend pkgs.yt-dlp pkgs.ffmpeg-headless pkgs.deno pkgs.python3 pkgs.coreutils pkgs.cacert ];
            extraCommands = ''
              mkdir -p usr/bin
              ln -s ${pkgs.coreutils}/bin/env usr/bin/env
            '';
            config = {
              Entrypoint = [ "${backend}/bin/jugether" ];
              Env = [
                "NODE_ENV=production"
                "PORT=5222"
                "PATH=${lib.makeBinPath [ pkgs.yt-dlp pkgs.ffmpeg-headless pkgs.deno pkgs.python3 pkgs.coreutils ]}"
                "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
              ];
              ExposedPorts = { "5222/tcp" = { }; };
            };
          };
          updaterImage = pkgs.dockerTools.buildLayeredImage {
            name = "jugether-ytdlp-updater";
            tag = "latest";
            contents = [ updater pkgs.bash pkgs.curl pkgs.coreutils pkgs.gawk pkgs.python3 pkgs.cacert ];
            extraCommands = ''
              mkdir -p usr/bin
              ln -s ${pkgs.coreutils}/bin/env usr/bin/env
            '';
            config = {
              Entrypoint = [ "${updater}/bin/jugether-ytdlp-updater" ];
              Env = [
                "PATH=${lib.makeBinPath [ pkgs.bash pkgs.curl pkgs.coreutils pkgs.gawk pkgs.python3 ]}"
                "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
              ];
            };
          };
        in {
          inherit frontend backend updater image;
          # This is the development toolchain installed by devcontainer.json.
          dev = environment system;
          updater-image = updaterImage;
          default = image;
        });

      devShells = forAllSystems (system:
        let pkgs = nixpkgs.legacyPackages.${system};
        in {
          default = pkgs.mkShell { packages = [ (environment system) ]; };
        });
    };
}
