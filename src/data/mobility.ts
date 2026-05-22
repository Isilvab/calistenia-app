// Daily mobility routine

export interface MobilityExercise {
  id: string
  name: string
  target: string  // '2 × 10', '10 reps', '30 seg / lado', etc.
}

export const MOBILITY: MobilityExercise[] = [
  { id: 'dislocates', name: 'Shoulder dislocates con palo', target: '2 × 10'        },
  { id: 'catcow',     name: 'Cat-cow',                      target: '10 reps'        },
  { id: 'wgs',        name: "World's greatest stretch",     target: '5 / lado'       },
  { id: '9090',       name: '90/90 hip stretch',            target: '30 seg / lado'  },
  { id: 'couch',      name: 'Couch stretch',                target: '45 seg / lado'  },
  { id: 'pancake',    name: 'Pancake stretch sentado',      target: '60 seg'         },
]
