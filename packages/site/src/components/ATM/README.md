This directory contains the components to build the ATM state-machine demo at https://yay-machine.js.org/quick-start/

The root component is [`<ATM />`](./ATM.tsx).

Many of the ATM sub-systems (card-reader, keypad, cash-dispenser and bank) are internally implemented as state-machines themselves. This is really just an implementation detail, but also

1. we need something stateful and have the ability to register listeners for state changes, and we already have a handy library for that, and
2. we like yummy dog food
