import { spaceExtensionContext, setRootDir, setDevEnv } from '../src/spaces'
import { StateJson } from '@incentum/praxis-interfaces';

declare var expect: any

const startTokenize =
`
(
  $newstate := {
    'ended': false,
    'owner': $action.ledger,
    'view': {
      'title': $form.title,
      'subtitle': $form.subtitle,
      'description': $form.description,
      'msgs': ['tokenize started']
    }
  };

  $out := $x.output($action.ledger, [], $form.title, $form.subtitle, 'Send this output to the contract when you want to end it', $action.tags);
  $x.result($newstate, [$out])
)
`

const identityExpr =
`
(
  $x.assert.isNotNaN($form.min, 'min isNaN');
  $x.assert.isAtLeast($number($form.min), 0, 'min must be >= 0');

  $min := $x.toCoinUnit($form.min, $x.coin.praxDecimals);
  $coin := $x.coin.prax($min);
  $newstate := {
    'ended': false,
    'owner': $action.ledger,
    'coin': $coin,
    'tags': $action.tags,
    'view': {
      'title': $form.title,
      'subtitle': $form.subtitle,
      'description': $form.description,
      'msgs': ['earn started']
    }
  };

  $out := $x.output($action.ledger, [], $form.title, $form.subtitle, 'Send this output to the contract when you want to end it', $action.tags);
  $x.result($newstate, [$out])
)
`

const tokenizeMusic =
`
(
  $x.assert.equal($state.owner, $action.ledger, 'you are not the owner');
  $x.assert.isNotTrue($state.ended, 'contract was ended');
  $x.assert.isOk($form.symbol, 'symbol is required');
  $x.assert.isAtLeast($form.decimals, 0, 'decimals must be >= 0');
  $x.assert.isAtLeast($form.amount, 1, 'amount must be at least 1');

  $all := $queryOutputs([{'key': 'tags', 'cond': '^Send this output*'}], 'unused');

  $mint := $x.mint($action.ledger, $form.symbol, $form.amount, $form.decimals, $form.title, $form.subtitle, $form.description, $action.tags, {}, $form.metadata);

  $msg := 'tokenize music ' & $form.metadata.song;
  $view := {
    'view': {
      'title': $state.view.title,
      'subtitle': $state.view.subtitle,
      'description': $state.view.description,
      'msgs': $append($state.view.msgs, [$msg])
    }
  };
  $newState := $merge([$state, $view]);
  $x.result($newState, [], [$mint])
)
`

const simpleAdvice =
`
(
  $x.assert.isNotTrue($state.ended, 'contract was ended');
  $x.assert.equal($count($inputs), 1, 'only one input is allowed');

  $i := $inputs[0];
  $o := $i.output;
  $x.assert.equal($count($o.coins), 1, 'please only send me one coin');
  $coin := $o.coins[0];
  $mycoin := $state.coin;
  $x.assert.isTrue($x.coin.same($coin, $mycoin), 'only send me ' & $mycoin.symbol);
  $x.assert.isTrue($x.coin.greaterThanOrEqual($coin, $mycoin), 'sorry, you must send me at least ' & $x.toDisplay($mycoin) & ' ' & $mycoin.symbol);

  $msg := 'simpleAdvice ' & $x.toDisplay($coin) & ' ' & $coin.symbol & ' from ' & $action.ledger;
  $view := {
    'view': {
      'title': $state.view.title,
      'subtitle': $state.view.subtitle,
      'description': $state.view.description,
      'msgs': $append($state.view.msgs, [$msg])
    }
  };
  $newState := $merge([$state, $view]);
  $data := {
    'replyTo': $action.ledger,
    'tags': $action.tags,
    'earnType': 'simpleAdvice'
  };
  $out := $x.output($state.owner, $o.coins, $form.title, $form.subtitle, $form.description, $state.tags, $data);
  $x.result($newState, [$out])
)
`

const space = 'testspace'
const ledger = 'someledgerName'
const anotherLedger = 'anotherLedger'
const state: StateJson = {
  coins: [],
  state: {},
}
const context = spaceExtensionContext(ledger, state)
const anotherContext = spaceExtensionContext(anotherLedger, state)
const anotherSpace = `${ledger}:${space}`
setRootDir('/home/bill/.spaces-test')
setDevEnv()

describe('db e2e', async () => {

  beforeAll(async () => {
  });

  afterAll(async () => {
    await context.functions.deleteSpace(space)
  });

  function sleep(ms) {
    return new Promise((resolve) =>
      setTimeout(resolve, ms)
    );
  }

  let result
  it('createSpace', async () => {

    result = await context.functions.createSpace(space)
    expect(result.error).not.toBeTruthy()

    const whitespaceTextField = {
      'analyzer': {
        'class': 'WhitespaceAnalyzer'
      },
      'similarity': {
        'class': 'BM25Similarity', 
        'b': 0.15
      },
      'store': true,
      'type': 'text'
    };
    
    const fields = {
      'title': whitespaceTextField,
      'subtitle': whitespaceTextField,
      'description': whitespaceTextField
    };
    
    const rf = context.functions.registerFieldsForSpace(space, fields);
    expect(result.error).not.toBeTruthy()

  });

  it('add some documents', async () => {

    const doc1 = {
	    "title": "bills document1 title",
	    "subtitle": "bills document1 subtitle",
	    "description": "bills document1 description"
	  }
    
    const doc2 = {
	    "title": "bills document2 title",
	    "subtitle": "bills document2 subtitle",
	    "description": "bills document2 description"
	  }
    
    const doc3 = {
	    "title": "bills document3 title",
	    "subtitle": "bills document3 subtitle",
	    "description": "bills document3 description"
	  }

    
    result = await context.functions.addDocumentToSpace(space, doc1)
    expect(result.error).not.toBeTruthy()
    result = await context.functions.addDocumentToSpace(space, doc2)
    expect(result.error).not.toBeTruthy()
    result = await context.functions.addDocumentToSpace(space, doc3)
    expect(result.error).not.toBeTruthy()

    console.log('commiting')
    result = await context.functions.commitSpace(space)
    expect(result.error).not.toBeTruthy()
    console.log('space commited')

  });

  it('so some searches', async () => {

    const query = { 
      query: {
        class: "TermQuery",
        field: "title",
        term: "bills"
      },
      retrieveFields: ["title", "subtitle", "description"]
    }

    console.log('searchSpace', query)
    result = await context.functions.searchSpace(space, query)
    expect(result.error).not.toBeTruthy()
    expect(result.hits.totalHits).toBe(3)
  });

  it('test permissions', async () => {

    const doc = {
      "_praxis_permission_ledger": anotherLedger,
      "_praxis_commitSpace": false,
      "_praxis_addDocument": false,
      "_praxis_deleteDocument": false,
      "_praxis_updateDocument": false,
      "_praxis_search": true
	  }

    result = await context.functions.setSpacePermissions(space, doc)
    expect(result.error).not.toBeTruthy()

    result = await context.functions.commitSpace(space)
    expect(result.error).not.toBeTruthy()

    const doc3 = {
	    "title": "bills document3 title",
	    "subtitle": "bills document3 subtitle",
	    "description": "bills document3 description"
	  }
    result = await anotherContext.functions.addDocumentToSpace(anotherSpace, doc3)
    console.log('should fail', result)
    expect(result.error).toBeTruthy()

    const query = { 
      query: {
        class: "TermQuery",
        field: "title",
        term: "bills"
      },
      retrieveFields: ["title", "subtitle", "description"]
    }

    console.log('searchSpace', query)
    result = await anotherContext.functions.searchSpace(anotherSpace, query)
    expect(result.error).not.toBeTruthy()
    expect(result.hits.totalHits).toBe(3)
  });

  it('change permission and test again', async () => {

    const doc = {
      "_praxis_permission_ledger": anotherLedger,
      "_praxis_commitSpace": false,
      "_praxis_addDocument": true,
      "_praxis_deleteDocument": false,
      "_praxis_updateDocument": false,
      "_praxis_search": true
	  }

    result = await context.functions.setSpacePermissions(space, doc)
    expect(result.error).not.toBeTruthy()

    result = await context.functions.commitSpace(space)
    expect(result.error).not.toBeTruthy()

    const doc4 = {
	    "title": "bills document4 title",
	    "subtitle": "bills document4 subtitle",
	    "description": "bills document4 description"
	  }
    result = await anotherContext.functions.addDocumentToSpace(anotherSpace, doc4)
    console.log('should work', result)
    expect(result.error).not.toBeTruthy()

    result = await context.functions.commitSpace(space)
    expect(result.error).not.toBeTruthy()
    console.log('space commited')

    const query = { 
      query: {
        class: "TermQuery",
        field: "title",
        term: "bills"
      },
      retrieveFields: ["title", "subtitle", "description"]
    }

    console.log('searchSpace', query)
    result = await anotherContext.functions.searchSpace(anotherSpace, query)
    expect(result.error).not.toBeTruthy()
    expect(result.hits.totalHits).toBe(4)
  });

});
