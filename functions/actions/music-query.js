const debug = require('debug')('ia:actions:music-query:debug');
const warning = require('debug')('ia:actions:music-query:warning');
const _ = require('lodash');
const mustache = require('mustache');

const dialog = require('../dialog');
const {
  getMatchedTemplates,
  getMatchedTemplatesExactly,
  getPromptsForSlots,
} = require('../slots/slots-of-template');
const querySlots = require('../state/query');
const intentStrings = require('../strings').intents.musicQuery;

/**
 * Generate prompt for missed slots
 *
 * @param app
 * @returns {*}
 */
function generatePrompt (app) {
  const missedSlots =
    Object.keys(intentStrings.slots)
      .filter(slotName => !querySlots.hasSlot(app, slotName));

  if (missedSlots.length === 0) {
    debug(`we don't have any missed slots`);
    return null;
  }

  debug('we missed slots:', missedSlots);
  // const missedSlot = missedSlots[0];
  const prompts = getPromptsForSlots(
    intentStrings.prompts,
    missedSlots
  );
  if (!prompts) {
    warning(`we don't have any matched prompts`);
    return null;
  }

  return {
    speech: mustache.render(_.sample(prompts), {
      // TODO: pass all slots and suggestions as context
    }),
  };
}

/**
 * handle music query action
 * - fill slots of music query
 *
 * @param app
 */
function handler (app) {
  debug('Start music query handler');

  const newNames = [];
  const newValues = {};
  const answer = {
    speech: [],
  };

  for (let slotName in intentStrings.slots) {
    const value = app.getArgument(slotName);
    if (value) {
      querySlots.setSlot(app, slotName, value);
      newNames.push(slotName);
      newValues[slotName] = value;
    }
  }

  debug('We get few new slots', newValues);

  // we get new values
  if (newNames.length > 0) {
    // find the list of greetings which match recieved slots
    let validGreetings = getMatchedTemplatesExactly(
      intentStrings.greetings,
      newNames
    );

    if (validGreetings.length === 0) {
      validGreetings = getMatchedTemplates(
        intentStrings.greetings,
        newNames
      );
    }

    debug('We have few valid greetings', validGreetings);

    // choose one
    const oneGreeting = _.sample(validGreetings);
    if (oneGreeting) {
      answer.speech.push(mustache.render(oneGreeting, newValues));
    }
  } else {
    // TODO: we don't get any new values
    debug(`we don't get any new values`);
  }

  let prompt = generatePrompt(app);
  // TODO: should be simplified
  if (prompt) {
    answer.speech.push(prompt.speech);
  }

  if (answer.speech.length > 0) {
    dialog.ask(app, {
      speech: answer.speech.join('. '),
    });
  }
}

module.exports = {
  handler,
};
