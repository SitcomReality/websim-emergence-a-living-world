import { Personality } from './personality.js';
import { generateName } from './utils.js';
import { DecisionMaker } from './behavior/decision_maker.js';
import { Inventory } from './entity/components/inventory.js';
import { Relationships } from './entity/components/relationships.js';
import { Vitals } from './entity/components/vitals.js';
import { Task } from './entity/components/task.js';
import { Movement } from './entity/components/movement.js';
import { Appearance } from './entity/components/appearance.js';
import * as ActionHandler from './entity/action_handlers.js';
import * as Needs from './behavior/decision_making/needs_assessor.js';
import * as Perception from './entity/perception.js';

import { State } from './entity/components/state.js';
import { ResourceManager } from './entity/components/resource_manager.js';
import { RelationshipManager } from './entity/components/relationship_manager.js';

