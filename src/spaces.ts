import axios from 'axios'
import { get } from 'lodash';

let port = 5000
let rootDir = '/home/bill/.spaces'
const url = `http://127.0.0.1:${port}`

export interface SpaceField {
  name: string
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

export async function createSpace(space: string): Promise<void> {
  await axios.post(`${url}/createIndex`, {indexName: space, rootDir})
}

export async function deleteSpace(space: string): Promise<void> {
  await axios.post(`${url}/deleteIndex`, {indexName: space})
}

export async function commitSpace(space: string): Promise<number> {
  const resp =   await axios.post(`${url}/commit`, {indexName: space})
  return resp.data.gen || 0
}

export async function startSpace(space: string, primaryGen: number = -1): Promise<void> {
  await axios.post(`${url}/startIndex`, {indexName: space, primaryGen})
}

export async function stopSpace(space: string): Promise<void> {
  await axios.post(`${url}/stopIndex`, {indexName: space})
}

export async function registerFields(space: string, fields: SpaceField[]): Promise<any> {
  const send = fields.map((field) => ({ [field.name]: field}))
  return await axios.post(`${url}/registerFields`, { indexName: space, ...send})
}

export async function deleteDocuments(space: string, field: string, values: any[]): Promise<number> {
  const resp = await axios.post(`${url}/deleteDocuments`, { indexName: space, field, values})
  return resp.data.deleted
}

export async function addDocument(space: string, fields: any): Promise<void> {
  await axios.post(`${url}/addDocument`, {indexName: space, fields})
}

export async function updateDocument(space: string, term: UpdateDoc, fields: any): Promise<void> {
  await axios.post(`${url}/updateDocument`, {indexName: space, fields, term})
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
  drilldowns: Filter[]
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

export interface TopDocs {
  totalHits: number
  scoreDocs: ScoreDoc[]
}

export async function searchSpace(space: string[], search: SpaceSearch): Promise<TopDocs> {
  return { totalHits: 33, scoreDocs: [] }
}

export const spaceFunctions = {
  createSpace: async (space: string): Promise<boolean> => {
    await createSpace(space)
    return true
  },
  startSpace: async (space: string, gen: number): Promise<number> => {
    await startSpace(space, gen)
    return gen
  },
  stopSpace: async (space: string): Promise<boolean> => {
    await stopSpace(space)
    return true
  },
  deleteSpace: async (space: string): Promise<boolean> => {
    await deleteSpace(space)
    return true
  },
  commitSpace: async (space: string): Promise<number> => {
    return await commitSpace(space)
  },
  registerFields: async (space: string, fields: SpaceField[]): Promise<number> => {
    return await registerFields(space, fields)
  },
  addDocument: async (space: string, fields: any): Promise<boolean> => {
    await addDocument(space, fields)
    return true
  },
  deleteDocument: async (space: string, field: string, values: any): Promise<boolean> => {
    await deleteDocuments(space, field, values)
    return true
  },
  updateDocument: async (space: string, term: UpdateDoc, fields: any): Promise<boolean> => {
    await updateDocument(space, term, fields)
    return true
  },
  searchSpace: async (space: string[], search: SpaceSearch): Promise<TopDocs> => {
    return await searchSpace(space, search)
  },
}
