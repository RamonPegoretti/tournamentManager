# bbpPairings

`bbpPairings` is a statically linked Linux x86-64 build of [bbpPairings](https://github.com/BieremaBoyzProgramming/bbpPairings)
(commit 8f9e3c5, built with `make static=yes`), a FIDE-endorsed engine for the Dutch Swiss system.
It is licensed under the Apache License 2.0 (`bbpPairings.LICENSE.txt`).

The app writes a TRF file and runs `bbpPairings --dutch input.trf -p output.txt` (see `src/lib/pairing.ts`).
To rebuild: clone the repo, run `make static=yes`, and copy `bbpPairings.exe` here as `bbpPairings`.
