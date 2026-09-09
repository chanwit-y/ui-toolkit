import { ApiEditor } from '../Api'
import { ModelEditor } from '../Model'
import { GroupSidebar } from './GroupSidebar'
import { LibraryScopeContext } from './scope'

/**
 * A portal library page: the group rail beside the same Models / APIs editor
 * the studio uses, in `library` scope (every item, group filter, delete).
 */
export function LibraryPage({ kind }: { kind: 'api' | 'model' }) {
  return (
    <LibraryScopeContext.Provider value="library">
      <div className="flex min-h-0 flex-1">
        <GroupSidebar />
        {kind === 'api' ? <ApiEditor /> : <ModelEditor />}
      </div>
    </LibraryScopeContext.Provider>
  )
}
