{
  description = "YTBunty development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ];
      environment = system:
        let pkgs = nixpkgs.legacyPackages.${system};
        in pkgs.buildEnv {
          name = "ytbunty-tools";
          paths = with pkgs; [ nodejs_24 git sqlite yt-dlp ];
        };
    in
    {
      packages = forAllSystems (system: {
        dev = environment system;
        default = environment system;
      });

      devShells = forAllSystems (system:
        let pkgs = nixpkgs.legacyPackages.${system};
        in {
          default = pkgs.mkShell {
            packages = [ (environment system) ];
          };
        });
    };
}
