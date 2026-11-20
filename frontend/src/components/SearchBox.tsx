import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { searchRecords, type SearchResults } from '../api/search';
import './SearchBox.css';

// Waits this long after the last key before asking the server.
export const SEARCH_DELAY_MS = 150;

type Option = { key: string; to: string; name: string; detail: string | null };
type Group = { label: string; options: Option[] };

function groupsOf(results: SearchResults): Group[] {
  return [
    {
      label: 'Organizations',
      options: results.organizations.map((o) => ({
        key: `o${o.id}`,
        to: `/organizations/${o.id}`,
        name: o.name,
        detail: null,
      })),
    },
    {
      label: 'Contacts',
      options: results.contacts.map((c) => ({
        key: `c${c.id}`,
        to: `/contacts/${c.id}`,
        name: c.name,
        detail: c.organization_name,
      })),
    },
    {
      label: 'Deals',
      options: results.deals.map((d) => ({
        key: `d${d.id}`,
        to: `/deals/${d.id}`,
        name: d.name,
        detail: null,
      })),
    },
  ].filter((group) => group.options.length > 0);
}

// The search box in the top bar (R51 to R54). Results are grouped by kind.
export function SearchBox() {
  const navigate = useNavigate();
  const id = useId();
  const [text, setText] = useState('');
  // The answer for one query. Shown only while that query is still the text.
  const [answer, setAnswer] = useState<{
    query: string;
    groups: Group[] | null;
    error: string | null;
  }>({ query: '', groups: null, error: null });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const latest = useRef('');

  useEffect(() => {
    const query = text.trim();
    latest.current = query;
    if (!query) return;
    const timer = setTimeout(() => {
      searchRecords(query)
        .then((results) => {
          if (latest.current !== query) return;
          setAnswer({ query, groups: groupsOf(results), error: null });
          setActive(0);
        })
        .catch((failure: unknown) => {
          if (latest.current === query)
            setAnswer({ query, groups: null, error: errorMessage(failure) });
        });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const current = answer.query === text.trim() && text.trim() !== '';
  const groups = current ? answer.groups : null;
  const error = current ? answer.error : null;
  const options = groups?.flatMap((group) => group.options) ?? [];
  const showPanel = open && (groups !== null || !!error);

  function choose(option: Option) {
    navigate(option.to);
    setText('');
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!options.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(
        (current) => (current + step + options.length) % options.length,
      );
    } else if (event.key === 'Enter' && showPanel) {
      event.preventDefault();
      choose(options[active]);
    }
  }

  const listId = `${id}-results`;
  const optionId = (index: number) => `${id}-option-${index}`;
  let index = -1;

  return (
    <div
      className="search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <input
        type="search"
        className="search-input"
        role="combobox"
        aria-label="Search"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && options.length ? optionId(active) : undefined
        }
        placeholder="Search organizations, contacts and deals"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showPanel && (
        <div className="search-panel">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!error && options.length === 0 && (
            <p className="search-empty" role="status">
              No matches
            </p>
          )}
          <div id={listId} role="listbox" aria-label="Search results">
            {groups?.map((group) => (
              <div
                key={group.label}
                role="group"
                aria-labelledby={`${id}-${group.label}`}
              >
                <p className="search-group" id={`${id}-${group.label}`}>
                  {group.label}
                </p>
                {group.options.map((option) => {
                  index += 1;
                  const mine = index;
                  return (
                    <div
                      key={option.key}
                      id={optionId(mine)}
                      role="option"
                      aria-selected={mine === active}
                      className="search-option"
                      // Focus stays in the box (aria-activedescendant), so the
                      // options are not tab stops. Enter is handled in the box.
                      tabIndex={-1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') choose(option);
                      }}
                      // Keep focus in the box, so the list does not close before the click.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(option)}
                      onMouseEnter={() => setActive(mine)}
                    >
                      <span>{option.name}</span>
                      {option.detail && (
                        <span className="muted"> {option.detail}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
