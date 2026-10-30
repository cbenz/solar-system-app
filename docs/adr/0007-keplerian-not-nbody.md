# The simulation is Keplerian, not N-body

Every body's position comes from a closed-form two-body orbit, never from integrating forces. The child can change a body's mass, distance or speed, or drag it off its orbit, and the new orbit is derived from the resulting state vector.

This is what keeps the scrubber honest: the timeline jumps to any instant, forwards or backwards, because position is a function of time rather than a simulation history. It is also why parameter editing belongs to the sandbox and not to an activity of its own — a sandbox is where you change the model.

Consequences: no chaotic multi-body choreography, no collisions worth simulating, no third body perturbing an orbit. A body dropped with no velocity needs a convention, since a state vector at rest has no defined orbit: it keeps its previous velocity, or starts circular at that radius.

The interaction for placing a body with a finger is not designed yet; it is deferred to the design phase, not dropped.
