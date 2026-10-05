# Rejected options

- Extending ChengJing's local `checkFit/calculateCoords` into a shared engine was rejected:
  it does not cover the required clipping, RTL, dynamic-size and auto-update boundaries.
- Exposing `@floating-ui/vue` types was rejected because it would make a third-party
  adapter part of Yue's public contract.
