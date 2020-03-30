import findUp from 'next/dist/compiled/find-up'
import path from 'path'
import {
  CONFIG_FILE,
  PHASE_DEVELOPMENT_SERVER,
  PHASE_EXPORT,
  PHASE_PRODUCTION_BUILD,
} from '../../next-server/lib/constants'
import { normalizeConfig } from '../../next-server/server/config'

const EVENT_VERSION = 'NEXT_CLI_SESSION_STARTED'

type EventCliSessionStarted = {
  nextVersion: string
  nodeVersion: string
  cliCommand: string
  isSrcDir: boolean | null
  hasNowJson: boolean
  isCustomServer: boolean | null
  hasNextConfig: boolean
  buildTarget: string
  hasWebpackConfig: boolean
  hasBabelConfig: boolean
}

function hasBabelConfig(dir: string): boolean {
  try {
    const noopFile = path.join(dir, 'noop.js')
    const res = require('@babel/core').loadPartialConfig({
      cwd: dir,
      filename: noopFile,
      sourceFileName: noopFile,
    }) as any
    const isForTooling =
      res.options?.presets?.every(
        (e: any) => e?.file?.request === 'next/babel'
      ) && res.options?.plugins?.length === 0
    return res.hasFilesystemConfig() && !isForTooling
  } catch {
    return false
  }
}

type NextConfigurationPhase =
  | typeof PHASE_DEVELOPMENT_SERVER
  | typeof PHASE_PRODUCTION_BUILD
  | typeof PHASE_EXPORT

function getNextConfig(
  phase: NextConfigurationPhase,
  dir: string
): { [key: string]: any } | null {
  try {
    const configurationPath = findUp.sync(CONFIG_FILE, {
      cwd: dir,
    })

    if (configurationPath) {
      // This should've already been loaded, and thus should be cached / won't
      // be re-evaluated.
      const configurationModule = require(configurationPath)

      // Re-normalize the configuration.
      return normalizeConfig(
        phase,
        configurationModule.default || configurationModule
      )
    }
  } catch {
    // ignored
  }
  return null
}

export function eventCliSession(
  phase: NextConfigurationPhase,
  dir: string,
  event: Omit<
    EventCliSessionStarted,
    | 'nextVersion'
    | 'nodeVersion'
    | 'hasNextConfig'
    | 'buildTarget'
    | 'hasWebpackConfig'
    | 'hasBabelConfig'
  >
): { eventName: string; payload: EventCliSessionStarted }[] {
  // This should be an invariant, if it fails our build tooling is broken.
  if (typeof process.env.__NEXT_VERSION !== 'string') {
    return []
  }

  const userConfiguration = getNextConfig(phase, dir)

  const payload: EventCliSessionStarted = {
    nextVersion: process.env.__NEXT_VERSION,
    nodeVersion: process.version,
    cliCommand: event.cliCommand,
    isSrcDir: event.isSrcDir,
    hasNowJson: event.hasNowJson,
    isCustomServer: event.isCustomServer,
    hasNextConfig: !!userConfiguration,
    buildTarget: userConfiguration?.target ?? 'default',
    hasWebpackConfig: typeof userConfiguration?.webpack === 'function',
    hasBabelConfig: hasBabelConfig(dir),
  }
  return [{ eventName: EVENT_VERSION, payload }]
}
