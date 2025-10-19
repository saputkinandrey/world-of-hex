import { displayMod, generateUniqueId } from '../../../lib/utilities.js';
import * as Settings from '../../../lib/miscellaneous-settings.js';
import ModifierBucketEditor from './tooltip-window.js';
import { parselink } from '../../../lib/parselink.js';
import ResolveDiceRoll from './resolve-diceroll-app.js';

/**
 * Define some Typescript types.
 * @typedef {{mod: String, modint: Number, desc: String, plus: Boolean}} Modifier
 */
Hooks.once('init', async function () {
  // Hooks.on('closeModifierBucketEditor', (/** @type {any} */ _, /** @type {JQuery} */ element) => {
  //   $(element).hide() // To make this application appear to close faster, we will hide it before the animation
  // })

  // @ts-ignore -- Need to look into why a GurpsRoll isn't a Roll
  // CONFIG.Dice.rolls.push(GurpsRoll)
  // CONFIG.Dice.terms['d'] = GurpsDie // Hack to get Dice so nice working (it checks the terms["d"].name vs the Dice class name

  // MONKEY_PATCH
  // Patch DiceTerm.fromMatch to hi-jack the returned Die instances and in turn patch them to
  // include the properties we need to support Physical Dice
  /**
	if (!!DiceTerm.fromMatch) {
	  let _fromMatch = DiceTerm.fromMatch
	  let newFromMatch = function (match) {
		let result = _fromMatch(match)
		if (result instanceof Die && !result instanceof GurpsDie) result = new GurpsDie(result).asDiceTerm()
		return result
	  }
  
	  DiceTerm.fromMatch = newFromMatch
	}
	**/

  // MONKEY_PATCH
  // Patch Roll to have the properties we need for Physical Dice and modifier bucket handling.
  // TODO With this change, GurpsRoll becomes redundant -- consider removing it??
  if (!Roll.prototype._gurpsOriginalPrepareData) {
    Roll.prototype._gurpsOriginalPrepareData = Roll.prototype._prepareData;

    let gurpsPrepareData = function (data) {
      let d = Roll.prototype._gurpsOriginalPrepareData(data);
      if (!d.hasOwnProperty('gmodc'))
        Object.defineProperty(d, 'gmodc', {
          get() {
            let m = GURPS.ModifierBucket.currentSum();
            GURPS.ModifierBucket.clear();
            return parseInt(m);
          },
        });
      d.gmod = GURPS.ModifierBucket.currentSum();
      d.margin = GURPS.lastTargetedRoll?.margin;
      return d;
    };

    Roll.prototype._prepareData = gurpsPrepareData;

    // Now add the dieOverride static variable and the isLoaded getter:
    Roll.dieOverride = false;
    Object.defineProperty(Roll.prototype, 'isLoaded', {
      // Used alternate define form, which defines 'this'.   get: () => {} does not set 'this'
      get() {
        return this.terms.some(
          (term) => term instanceof GurpsDie && !!term._loaded,
        );
      },
    });
  }
});

Hooks.once('ready', async function () {
  // new GgaContextMenu($('body'), $('body'), '#accumulator-center', `Dmg Accumulator`, [
  //   {
  //     name: 'Roll Damage!',
  //     icon: '<i class="fas fa-dice"></i>',
  //     callback: () => {},
  //     condition: () => true,
  //   },
  //   {
  //     name: 'Clear Entry',
  //     icon: '<i class="fas fa-trash"></i>',
  //     callback: () => {},
  //     condition: () => true,
  //   },
  // ])
});

export class GurpsDie extends Die {
  /**
   * @param {Die} die
   */
  constructor(die) {
    super({
      number: die.number,
      faces: die.faces ? die.faces : 6, // GurpsDie (type 'd') defaults to 6 faces
      // @ts-ignore
      modifiers: die.modifiers,
      results: die.results,
      options: die.options,
    });

    this.id = generateUniqueId();
    /**
     * @type {number[]|null}
     */
    this._loaded = null;

    // baseExpression is called from a closure elsewhere so need to bind it
    this.baseExpression = this.baseExpression.bind(this);
    this.evaluate = this.evaluate.bind(this);
  }

  /**
   *
   * @returns {DiceTerm}
   */
  asDiceTerm() {
    if (this instanceof DiceTerm) return this;
    throw new Error('Unexpected: GurpsDie is not a DiceTerm');
  }

  baseExpression() {
    const x = Die.DENOMINATION === 'd' ? this.faces : Die.DENOMINATION;
    return `${this.number}d${x}`;
  }

  /**
   * @inheritdoc
   */
  roll({ minimize = false, maximize = false } = {}) {
    if (!this._loaded || !this._loaded.length)
      return super.roll({ minimize, maximize });

    if (CONFIG.debug.dice)
      console.log(
        `Loaded Die [${this.baseExpression()}] -- values: ${this._loaded}`,
      );

    // Preserve the order: set value to the first element in _loaded, and update
    // _loaded to contain the remaining elements.
    let [value, ...remainder] = this._loaded;
    this._loaded = remainder;

    /** @type {DiceTerm.Result} */
    const roll = { active: true, result: value };
    this.results.push(roll);
    return roll;
  }

  /**
   * @inheritdoc
   */
  // @ts-ignore
  evaluate({ minimize = false, maximize = false, async = false } = {}) {
    if (this._evaluated) {
      throw new Error(
        `The ${this.constructor.name} has already been evaluated and is now immutable`,
      );
    }
    this._evaluated = true;

    return async
      ? this._evaluate({ minimize, maximize })
      : this._evaluateSync({ minimize, maximize });
  }

  /**
   * Evaluate the term.
   * @param {object} [options={}]           Options which modify how the RollTerm is evaluated, see RollTerm#evaluate
   * @param {boolean} [options.minimize=false]    Minimize the result, obtaining the smallest possible value.
   * @param {boolean} [options.maximize=false]    Maximize the result, obtaining the largest possible value.
   * @returns {Promise<RollTerm>}
   */
  // @ts-ignore
  async _evaluate({ minimize = false, maximize = false } = {}) {
    let physicalDice =
      game.user?.isTrusted &&
      game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_PHYSICAL_DICE);

    if (physicalDice) {
      return new Promise(async (resolve) => {
        let dialog = new ResolveDiceRoll(this);

        let callback = async () => {
          let die = this._evaluateSync({ minimize, maximize }).asDiceTerm();
          await dialog.close();
          resolve(die);
        };

        dialog.applyCallback = callback;
        dialog.rollCallback = callback;
        dialog.render(true);
      });
    } else {
      // @ts-ignore
      return await super._evaluate({ minimize, maximize });
    }
  }
}

/**
 * Install Custom Roll to support global modifier access (@gmod & @gmodc) and
 * custom die-rolling behaviors, like the "Phyical Dice" feature.
 *
 * Code can check for the GurpsRoll#isLoaded flag to know that the user entered
 * his dice roll values via the physical dice feature.
 */
export class GurpsRoll extends Roll {
  static dieOverride = false;

  /**
   * @param {String} formula
   * @param {*} data
   * @param {*} options
   */
  constructor(formula, data = {}, options = {}) {
    super(formula, data, options);
  }

  /**
   * The Roll is "loaded" if any term has the _loaded property.
   */
  get isLoaded() {
    return this.terms.some(
      (term) => term instanceof GurpsDie && !!term._loaded,
    );
  }

  /**
   * @inheritdoc
   * @param {*} data
   * @returns {*}
   */
  _prepareData(data) {
    let d = super._prepareData(data);
    if (!d.hasOwnProperty('gmodc'))
      Object.defineProperty(d, 'gmodc', {
        get() {
          let m = GURPS.ModifierBucket.currentSum();
          GURPS.ModifierBucket.clear();
          return parseInt(m);
        },
      });
    d.gmod = GURPS.ModifierBucket.currentSum();
    d.margin = GURPS.lastTargetedRoll?.margin;
    return d;
  }
}
