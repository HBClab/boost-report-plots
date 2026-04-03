{
  description = "A Nix-flake-based development environment for report ingestion and plotting";

  inputs.nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.1.*.tar.gz";

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forEachSupportedSystem = f: nixpkgs.lib.genAttrs supportedSystems (system: f {
        pkgs = import nixpkgs { inherit system; overlays = [ self.overlays.default ]; };
      });
    in
    {
      overlays.default = final: prev: rec {
        nodejs = prev.nodejs;
        yarn = (prev.yarn.override { inherit nodejs; });
      };

      devShells = forEachSupportedSystem ({ pkgs }: {
        default = pkgs.mkShell {
          packages = with pkgs; [ 
            node2nix 
            nodejs 
            nodePackages.pnpm 
            postgresql
            python312
            python312Packages.pytest
            python312Packages.psycopg
            yarn 
            uv
          ];
        };
      });

      shellHook = ''
        uv tool install specify-cli --from git+https://github.com/github/spec-kit.git 
        export PATH="$HOME/.local/bin:$PATH"
      '';
    };
}
