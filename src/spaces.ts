import axios from 'axios'
import { uniqueKey, StateJson, hashString } from '@incentum/praxis-interfaces'
import rimraf from 'rimraf'

let port = 5000
let host = '127.0.0.1'
let rootDir = '/home/bill/.spaces'
const getUrl = () => `http://${host}:${port}`

export function hashSpaceName(ledger: string, space: string) {
  return 'SP' + hashString(`${ledger}/${space}`)
}

export interface ExtensionContext {
  functions: any
}

const startedSpaces = new Map<string, StartedSpace>()
const cachedPermissions = new Map<string, Map<string, PermissionDocument>>()
export async function startChain() {
}

export async function endChain() {
  for (const key of startedSpaces.keys()) {
    const started = startedSpaces.get(key)!
    await stopSpace(started.hashSpace)
  }
}

function setCachedPermission(space: string, permissions: PermissionDocument) {
  const ledger = permissions._praxis_permission_ledger
  let spacePerms = cachedPermissions.get(space)
  if (!spacePerms) {
    spacePerms = new Map<string, PermissionDocument>()
    cachedPermissions.set(space, spacePerms)
  }
  spacePerms.set(ledger, permissions)
}

function removeCachedPermission(space: string, ledger: string): void {
  const spacePerms = cachedPermissions.get(space)
  if (!spacePerms) { return }
  spacePerms.delete(ledger)
}

function getCachedPermission(space: string, ledger: string): PermissionDocument | undefined {
  const spacePerms = cachedPermissions.get(space)
  return spacePerms ? spacePerms.get(ledger) : undefined
}

export interface Analyzer {
  charFilters?: string[]
  class: string

  // ArabicAnalyzer
  // ArmenianAnalyzer
  // BasqueAnalyzer
  // BrazilianAnalyzer
  // BulgarianAnalyzer
  // CJKAnalyzer
  // CatalanAnalyzer
  // EnglishAnalyzer
  // GermanAnalyzer
  // StandardAnalyzer
  // WhitespaceAnalyzer
  stemExclusionSet?: string[]
  stopWords?: string[]

  // CollationKeyAnalyzer
  locale?: {
    country: string
    language: string
    variant: string
  }

  offsetGap?: number
  positionIncrementGap?: number
  tokenFilters?: string[]
  tokenizer?: string
}

export interface SpaceField {
  analyzer?: Analyzer
  dateTimeFormat?: string
  docValuesFormat?: string
  expression?: string
  facet?: 'yes' | 'no',
  facetIndexFieldName?: string
  group?: boolean
  highlight?: boolean
  indexAnalyzer?: Analyzer
  indexOptions?: string
  multiValued?: boolean
  omitNorms?: boolean
  postingsFormat?: string
  search?: boolean
  searchAnalyzer?: Analyzer
  similarity?: {
    // DefaultSimilarity
    class?: string
    // BM25Similarity
    b?: number
    k1?: number
  }
  sort?: boolean
  store?: boolean
  storeDocValues?: boolean
  termVectors?: string
  tokenize?: boolean
  type: 'atom' | 'text' | 'boolean' | 'long' | 'int' | 'double' | 'float' | 'lat_lon' | 'date_time' | 'virtual'
}

export interface UpdateDoc {
  term: {
    field: string
    term: any
  }
}

export function setRootDir(dir: string) {
  rootDir = dir
}

export function setPort(p: number) {
  port = p
}

export function setHost(h: string) {
  host = h
}

export function getRootDir(space: string): string {
  return `${rootDir}/${space}`
}

export async function createSpace(space: string): Promise<void> {
  const result = await axios.post(`${getUrl()}/createIndex`, {indexName: space, rootDir: getRootDir(space)})
}

export async function deleteSpace(space: string): Promise<void> {
  await axios.post(`${getUrl()}/deleteIndex`, {indexName: space})
}

export async function commitSpace(space: string): Promise<number> {
  const resp = await axios.post(`${getUrl()}/commit`, {indexName: space})
  return resp.data.indexGen || 0
}

export async function startSpace(space: string, commit?: Commit): Promise<void> {
  await axios.post(`${getUrl()}/startIndex`, {indexName: space })
}

export async function stopSpace(space: string): Promise<void> {
  await axios.post(`${getUrl()}/stopIndex`, {indexName: space})
}

export async function registerFields(space: string, fields: any): Promise<any> {
  return await axios.post(`${getUrl()}/registerFields`, { indexName: space, fields})
}

export async function deleteDocuments(space: string, field: string, values: any[]): Promise<number> {
  const resp = await axios.post(`${getUrl()}/deleteDocuments`, { indexName: space, field, values})
  return resp.data.deleted
}

export async function addDocument(space: string, fields: any): Promise<void> {
  await axios.post(`${getUrl()}/addDocument`, {indexName: space, fields})
}

export async function updateDocument(space: string, term: UpdateDoc, fields: any): Promise<void> {
  await axios.post(`${getUrl()}/updateDocument`, {indexName: space, fields, term})
}

export async function rollback(space: string): Promise<void> {
  await axios.post(`${getUrl()}/rollback`, {indexName: space})
}

export async function searchSpace(space: string, search: SpaceSearch, commit?: Commit): Promise<Hits> {
  const parms = commit ? {indexName: space, ...search, indexGen: commit.gen} : {indexName: space, ...search}
  const ret = await axios.post(`${getUrl()}/search`, parms)
  return ret.data
}

export type Occur = 'FILTER' | 'MUST' | 'MUST_NOT' | 'SHOULD'
export type Classes =
  'BooleanFieldQuery' |
  'BooleanQuery' |
  'CommonTermsQuery' |
  'CommonTermsQuery' |
  'ConstantScoreQuery' |
  'DisjunctionMaxQuery' |
  'FuzzyQuery' |
  'LatLonBoxQuery' |
  'LatLonDistanceQuery' |
  'LatLonPolygonQuery' |
  'MultiPhraseQuery' |
  'PrefixQuery' |
  'RegexpQuery' |
  'TermQuery' |
  'TermRangeQuery' |
  'ToParentBlockJoinQuery' |
  'WildcardQuery'

export interface SortChildHits {
  field: string
  missingLast?: boolean
  origin?: {
    latitude: number
    longitude: number
  }
  reverse?: boolean
  selector?: string
}

export interface NumericRange {
  label: string
  max: number
  maxInclusive?: boolean
  min: number
  minInclusive?: boolean
}

export interface PolygonQuery {
  holes: any[]
  vertices: any[]
}

export interface Filter {
  field: string
  numericRange: NumericRange
  query: Query
  value: string | string[]
}

export interface SubQuery {
  occur?: Occur
  query: Query
}

export interface Query {
  boost?: number
}

export interface BooleanFieldQuery extends Query {
  class: 'BooleanFieldQuery'
  field: string
}

export interface BooleanQuery extends Query {
  class: 'BooleanQuery'
  disableCoord?: boolean
  minumumNumberShouldMatch?: number
  subQueries: SubQuery[]
}

export interface CommonTermsQuery extends Query {
  class: 'CommonTermsQuery'
  highFreqOccur: Occur
  lowFreqOccur: Occur
  maxTermFrequence: number
  terms: string[]
}

export interface ConstantScoreQuery extends Query {
  class: 'ConstantScoreQuery'
  query: Query
}

export interface DisjunctionMaxQuery extends Query {
  class: 'DisjunctionMaxQuery'
  subQueries: Query[]
  tieBreakMultiplier?: number
}

export interface FuzzyQuery extends Query {
  class: 'FuzzyQuery'
  maxEdits?: number
  maxExpansions?: number
  prefixLength?: number
  term: string
  transposition?: boolean
}

export interface LatLonBoxQuery extends Query {
  class: 'LatLonBoxQuery'
  maxLatitude: number
  maxLongitude: number
  minLatitude: number
  minLongitude: number
}

export interface LatLonDistanceQuery extends Query {
  class: 'LatLonDistanceQuery'
  latitude: number
  longitude: number
  radiusMeters: number
}

export interface LatLonPolygonQuery extends Query {
  class: 'LatLonPolygonQuery'
  geojson?: string
  polygons?: PolygonQuery[]
}

export type MultiPhraseTerms = string | number
export interface MultiPhraseQuery extends Query {
  class: 'MultiPhraseQuery'
  slop?: number
  terms: MultiPhraseTerms[]
}

export interface PrefixQuery extends Query {
  class: 'PrefixQuery'
  term: string
}

export interface RegexpQuery extends Query {
  class: 'RegexpQuery'
  regexp?: string
}

export interface TermQuery extends Query {
  class: 'TermQuery'
  term: string
}

export interface TermRangeQuery extends Query {
  class: 'TermRangeQuery'
  includeLower?: boolean
  includeUpper?: boolean
  lowerTerm: string
  upperTerm: string
}

export interface ToParentBlockJoinQuery extends Query {
  class: 'ToParentBlockJoinQuery'
  childHits: {
    maxChildren?: number
    sort?: SortChildHits[]
    trackMaxScore?: boolean
    trackScores?: boolean
  }
  childQuery: Query
  parentsFilter: Filter
  scoreMode?: string
}

export interface WildcardQuery extends Query {
  class: 'WildcardQuery'
  term: string
}

export interface TextQuery extends Query {
  defaultField: string
  text: string
}

export interface Facet {
  dim: string
  labels: string[]
  numericRanges?: NumericRange[]
  path: string | string[]
  topN?: number
  useOrdsCache?: boolean
}

export interface QueryParser {
  class?: 'classic' | 'SimpleQueryParser' | 'MultiFieldQueryParser'
}

export interface ClassicQueryParser extends QueryParser {
  class?: 'classic'
  defaultField: string

  defaultOperator?: string
  enablePositionIncrements?: boolean
  fuzzyMinSim?: number
  fuzzyPrefixLength?: number
  locale?: string
  phraseSlop?: number
}

export interface MultiFieldQueryParser extends QueryParser {
  class: 'MultiFieldQueryParser'
  fields?: string[]
  defaultOperator?: string
  enablePositionIncrements?: boolean
  fuzzyMinSim?: number
  fuzzyPrefixLength?: number
  locale?: string
  phraseSlop?: number
}

export interface SimpleQueryParser extends QueryParser {
  class: 'SimpleQueryParser'
  fields: string[]
  operators: string[]

  defaultOperator?: string
  enablePositionIncrements?: boolean
  fuzzyMinSim?: number
  fuzzyPrefixLength?: number
  locale?: string
  phraseSlop?: number
}

export interface Sort {
  doDocScores?: boolean
  doMaxScore?: boolean
  fields: string[]
}

export interface SpaceSearch {
  queryText?: string
  queryParser?: QueryParser
  query?: any
  grouping?: {
    field: string
    doDocScores?: boolean
    doMaxScore?: boolean
    doTotalGroupCount: boolean
    groupStart?: number
    groupsPerPage?: number
    hitsPerGroup?: number
    sort?: Sort[]
  }
  retrieveFields?: string[]
  facets?: Facet[]
  drilldowns?: Filter[]
  searchAfter?: {
    lastDoc: number
    lastFieldValues: string
    lastScore: number
  }
  sort?: Sort
  startHit?: number
  timeoutSec?: number
  topHits?: number
  virtualFields?: [{
    name: string
    expression: string
  }]
}

export interface ScoreDoc {
  doc: number
  float: number
  document: any
}

export interface Hit {
  doc: number
  fields: any
  score: number
}

export interface Hits {
  totalHits: number
  hits: Hit[]
  // TODO need to get commit for searches
  commit?: Commit
}

export type HashSpaceName = (ledger: string, space: string) => string

export async function getSpaceName(ledger: string, space: string, op: PermissionOp): Promise<string> {
  const maybeLedger = space.split(':')
  if (maybeLedger.length === 1) { return hashSpaceName(ledger, space) }
  const spaceName = hashSpaceName(maybeLedger[0], maybeLedger[1])
  if (op === PermissionOp.any) { return spaceName }
  if (op === PermissionOp.none) { throw new Error('Permission denied')}
  const has = await hasPermission(spaceName, ledger, op)
  if (!has) { throw new Error('Permission denied')}
  return spaceName
}

export function compoundSpaceName(space: string) {
  return space.includes(':') ? space.split(':') : false
}

enum PermissionOp {
  addDocument = '_praxis_addDocument',
  deleteDocument = '_praxis_deleteDocument',
  updateDocument = '_praxis_updateDocument',
  commitSpace = '_praxis_commitSpace',
  search = '_praxis_search',
  any = 'any',
  none = 'none',
}

interface Permission {
  _praxis_addDocument: boolean
  _praxis_deleteDocument: boolean
  _praxis_updateDocument: boolean
  _praxis_search: boolean
}

const permissionLedgerField = '_praxis_permission_ledger'
interface PermissionDocument extends Permission {
  _praxis_permission_ledger: string
}

async function getPermissions(space: string, ledger: string): Promise<PermissionDocument | undefined> {
  const query = {
    query: {
      class: 'TermQuery',
      field: permissionLedgerField,
      term: ledger,
    },
    retrieveFields: [
      permissionLedgerField,
      '_praxis_commitSpace',
      '_praxis_addDocument',
      '_praxis_deleteDocument',
      '_praxis_updateDocument',
      '_praxis_search',
    ],
  }

  const hits = await searchSpace(space, query)
  if (hits.totalHits === 0) { return undefined }
  return hits.hits[0].fields as PermissionDocument
}

function SetPermissions(state: StateJson, space: string, permissions: PermissionDocument): void {
  const ledger = permissions._praxis_permission_ledger
  deleteDocumentFromSpace(state, space, permissionLedgerField, [ledger])
  addDocumentToSpace(state, space, permissions)
  removeCachedPermission(space, ledger)
}

export async function hasPermission(space: string, ledger: string, op: PermissionOp) {
  let permissions = getCachedPermission(space, ledger)
  if (permissions && permissions[op]) { return true }
  permissions = await getPermissions(space, ledger)
  if (!permissions) { return false }
  setCachedPermission(space, permissions)
  return permissions[op] ? true : false
}

interface StartedSpace {
  hashSpace: string
  commit?: Commit
}

export async function getDirectoryHash(space: string): Promise<string> {
  return uniqueKey()
}

export interface Commit {
  gen: number
  hash: string
  space: string
}

export interface SpaceResult {
  error: boolean
  e?: any
}

export interface StartSpaceResult extends SpaceResult {
  commit?: Commit
}

export interface SearchSpaceResult extends SpaceResult {
  hits?: Hits
}

export interface RegisterFieldsSpaceResult extends SpaceResult {
  fields?: Hits
}

let dev = false
export function setDevEnv() {
  dev = true
}

export async function startSpaceIfNotStarted(space: string, commit?: Commit) {
  if (!startedSpaces.get(space)) {
    try {
      await startSpace(space, commit)
      startedSpaces.set(space, { hashSpace: space, commit })
    } catch (e) {
      // console.log('startSpace failed', e)
      if (!dev) {
        throw e
      } else {
        // TODO Only ignore if it's already open
        startedSpaces.set(space, { hashSpace: space, commit })
      }
    }
  }
}

enum DocActionType {
  add = 'add',
  delete = 'delete',
  update = 'update',
}

interface DocAction {
  space: string
  docAction: DocActionType
}

interface AddDocAction extends DocAction {
  fields: any
}

interface DeleteDocAction extends DocAction {
  field: string
  values: any
}

interface UpdateDocAction extends DocAction {
  term: UpdateDoc
  fields: any
}

type DocActions = AddDocAction | DeleteDocAction | UpdateDocAction

interface StateSpace {
  docActions: DocActions[]
}

function initSpace(state: StateJson): StateSpace {
  if (!state.state._stateSpace) {
    state.state._stateSpace = { docActions: [] }
  }
  return state.state._stateSpace
}

async function createRegisterFields(space: string) {
  const fieldSpec: SpaceField = {
    analyzer: {
      class: 'WhitespaceAnalyzer',
    },
    similarity: {
      class: 'BM25Similarity',
      b: 0.15,
    },
    store: true,
    type: 'text',
  }
  const booleanSpec: SpaceField = {
    store: true,
    type: 'boolean',
  }

  await registerFields(space, {
    _praxis_space: fieldSpec,
    _praxis_ledger: fieldSpec,
    _praxis_created: fieldSpec,
    _praxis_permission_ledger: fieldSpec,
    _praxis_commitSpace: booleanSpec,
    _praxis_addDocument: booleanSpec,
    _praxis_updateDocument: booleanSpec,
    _praxis_deleteDocument: booleanSpec,
    _praxis_search: booleanSpec,
  })
}

async function writeFirstDocument(space: string, ledger: string) {
  await addDocument(space, {
    _praxis_space: space,
    _praxis_ledger: ledger,
    _praxis_created: 'Space created',
  })
}

function addDocumentToSpace(state: StateJson, space: string, fields: any) {
  const stateSpace = initSpace(state)
  stateSpace.docActions.push({ docAction: DocActionType.add, space, fields })
}

function deleteDocumentFromSpace(state: StateJson, space: string, field: string, values: any) {
  const stateSpace = initSpace(state)
  stateSpace.docActions.push({ docAction: DocActionType.delete, space, field, values })
}

function updateDocumentInSpace(state: StateJson, space: string, term: UpdateDoc, fields: any) {
  const stateSpace = initSpace(state)
  stateSpace.docActions.push({ docAction: DocActionType.update, space, fields, term })
}

async function commitDocActions(state: StateJson, space: string) {
  const stateSpace = initSpace(state)
  const actions = stateSpace.docActions.filter((action) => action.space === space)
  stateSpace.docActions = stateSpace.docActions.filter((action) => action.space !== space)
  for (const action of actions) {
    switch (action.docAction) {
      case DocActionType.add: {
        const addAction = action as AddDocAction
        await startSpaceIfNotStarted(action.space)
        await addDocument(space, addAction.fields)
        break
      }
      case DocActionType.delete: {
        const deleteAction = action as DeleteDocAction
        await startSpaceIfNotStarted(action.space)
        await deleteDocuments(action.space, deleteAction.field, deleteAction.values)
        break
      }
      case DocActionType.update: {
        const updateAction = action as UpdateDocAction
        await startSpaceIfNotStarted(action.space)
        await updateDocument(action.space, updateAction.term, updateAction.fields)
        break
      }
    }
  }
}

async function rollbackSpace(space: string, state: StateJson) {
  try {
    await rollback(space)
  } catch (e) {
    // TODO what if this fails?
    console.log('rollback failed', e)
  }
}

const errorMessage = (err: { error: boolean, e?: Error}): string => {
  return err.e ? err.e.message : 'nomsg'
}

function deleteDir(dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    rimraf(dir, (err, val) => {
      resolve()
    })
  })
}

export const spaceExtensionContext = (ledger: string, state: StateJson): ExtensionContext => {

  const context: ExtensionContext = {
    functions: {
      searchSpace: async (space: string, search: SpaceSearch, commit?: Commit): Promise<SearchSpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.search)
          await startSpaceIfNotStarted(hashSpace)
          const hits = await searchSpace(hashSpace, search, commit)
          return { error: false, hits }
        } catch (e) {
          return { error: true, e }
        }
      },
      createSpace: async (space: string): Promise<SpaceResult> => {
        try {
          const hashSpace = hashSpaceName(ledger, space)
          console.log('createSpace', hashSpace)
          await createSpace(hashSpace)
          await startSpaceIfNotStarted(hashSpace)
          await createRegisterFields(hashSpace)
          await writeFirstDocument(hashSpace, ledger)
          await commitSpace(hashSpace)
          return { error: false }
        } catch (e) {
          console.log('createSpace error', e)
          return { error: true, e }
        }
      },
      startSpace: async (space: string, commit?: Commit): Promise<StartSpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.none)
          await startSpaceIfNotStarted(hashSpace, commit)
          return { error: false, commit }
        } catch (e) {
          return { error: true, e }
        }
      },
      stopSpace: async (space: string): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.none)
          if (startedSpaces.get(hashSpace)) {
            await stopSpace(hashSpace)
            startedSpaces.delete(hashSpace)
          }
          return { error: false }
        } catch (e) {
          console.log('stopSpace error', e)
          return { error: true, e }
        }
      },
      deleteSpace: async (space: string): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.none)
          await deleteSpace(hashSpace)
          const dir = getRootDir(hashSpace)
          await deleteDir(dir)
          return { error: false }
        } catch (e) {
          console.log('deleteSpace error', e)
          return { error: true, e }
        }
      },
      commitSpace: async (space: string): Promise<StartSpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.commitSpace)
          await startSpaceIfNotStarted(hashSpace)
          try {
            await commitDocActions(state, hashSpace)
            const hash = await getDirectoryHash(hashSpace) // or let commitSpace do this
            const gen = await commitSpace(hashSpace)
            return { error: false, commit: { gen, hash, space: hashSpace } }
          } catch (e) {
            await rollbackSpace(space, state)
            return { error: true, e }
          }
        } catch (e) {
          console.log('commitSpace error', e)
          return { error: true, e }
        }
      },
      registerFieldsForSpace: async (space: string, fields: any): Promise<RegisterFieldsSpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.none)
          await startSpaceIfNotStarted(hashSpace)
          const ret = await registerFields(hashSpace, fields)
          return { error: false, fields: ret.data }
        } catch (e) {
          console.log('registerFieldsForSpace error', e)
          return { error: true, e }
        }
      },
      addDocumentToSpace: async (space: string, fields: any): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.addDocument)
          addDocumentToSpace(state, hashSpace, fields)
          return { error: false }
        } catch (e) {
          console.log('addDocumentToSpace error', e)
          return { error: true, e }
        }
      },
      deleteDocumentsFromSpace: async (space: string, field: string, values: any): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.deleteDocument)
          deleteDocumentFromSpace(state, hashSpace, field, values)
          return { error: false }
        } catch (e) {
          console.log('deleteDocumentFromSpace error', e)
          return { error: true, e }
        }
      },
      updateDocumentInSpace: async (space: string, term: UpdateDoc, fields: any): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.updateDocument)
          updateDocumentInSpace(state, hashSpace, term, fields)
          return { error: false }
        } catch (e) {
          console.log('updateDocumentInSpace error', e)
          return { error: true, e }
        }
      },
      setSpacePermissions: async (space: string, permissions: PermissionDocument): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, space, PermissionOp.none)
          SetPermissions(state, hashSpace, permissions)
          return { error: false }
        } catch (e) {
          console.log('setSpacePermissions error', e)
          return { error: true, e }
        }
      },
      errorName: (err: { error: boolean, e?: Error}): string => {
        return err.e ? err.e.name : 'noname'
      },
      errorMessage,
      errorStack: (err: { error: boolean, e?: Error}): string => {
        return err.e && err.e.stack ? err.e.stack : 'nostack'
      },
    },
  }
  return context
}
