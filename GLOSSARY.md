# Solar system learning app

A browser app where a child explores why days and nights, seasons, years and eclipses happen, one activity at a time.

## How to read this

These are the canonical terms, in English, used in code, data and documentation. The app ships in several languages; each locale translates them into its own words, listed in the table at the bottom. The glossary defines the concept, never the label.

## Language

**Activity**:
A self-contained unit of the app built around a single phenomenon. It has one scene, and it decides what that scene shows.
_Avoid_: atelier, workshop, scenario, module, lesson, mode

**Guide**:
The scripted walkthrough inside an activity. It moves the view and narrates, pausing for the child to continue.
_Avoid_: story, demo, tour

**Mission**:
A task the child performs in the 3D scene itself, not in a form. The child acts on the model and the model answers.
_Avoid_: challenge, quiz, exercise

**Sandbox**:
An activity's free-exploration state: the same scene and the same settings as its missions, with nothing to solve.
_Avoid_: free mode, play mode, explore mode

**POV**:
The panel showing what an observer sees. POVs sit flush with each other at the edge of the screen, and an activity declares how many it needs, up to three.
_Avoid_: ground view, window, inset, PIP

**Space view**:
The view of the model from outside the bodies. Always the dominant view on screen.
_Avoid_: 3D view, orbital view, overview

**Observer**:
The person standing on a body, drawn as a coloured point, whose view fills a POV. An observer is placed by latitude only and stays stuck to the surface while time runs; each one has its own colour.
_Avoid_: red dot, character, avatar

**Subsystem**:
The set of bodies an activity shows. The Sun is in every subsystem; the other bodies drop out when the subsystem changes.
_Avoid_: scene, system

**True distance**:
Whether distances are the real ones. Off by default, because the scene has to stay readable; the distortion is printed in the scene when it is off. Settable independently of true size.
_Avoid_: scale, realistic, false distances

**Camera preset**:
A named camera position an activity offers in its toolbar. The zoom is clamped to the set of presets the activity declares.
_Avoid_: framing, view, viewpoint

**Level**:
An activity's difficulty, from 1 to 5. It grades the activity, never the child, and no age is ever shown.
_Avoid_: age, grade, class

**Night sky**:
The sky drawn above an observer after dark. The stars are decorative and not astronomically placed; the Moon is real and in its true position.
_Avoid_: starfield, background

**Visibility limit**:
Whether a body can actually be seen from a given point on the ground, given its apparent magnitude and angular size. Distinct from whether the body is present in the scene.
_Avoid_: attenuation, realism

## French labels

| Canonical | `fr` |
|---|---|
| Activity | Activité |
| Guide | Guide |
| Mission | Mission |
| Sandbox | Bac à sable |
| POV | Vue subjective |
| Space view | Vue de l'espace |
| Observer | Observateur |
| Subsystem | Sous-système |
| True distance | Distance réelle |
| Camera preset | Preset de caméra |
| Level | Niveau |
| Night sky | Ciel de nuit |
| Visibility limit | Limite de visibilité |
