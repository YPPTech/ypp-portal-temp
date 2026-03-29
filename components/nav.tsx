"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isNavHrefActive, resolveNavModel } from "@/lib/navigation/resolve-nav";
import { INSTRUCTOR_GROUP_EMOJI } from "@/lib/navigation/instructor-nav-layout";
import { STUDENT_MINIMAL_GROUP_EMOJI } from "@/lib/navigation/student-v1-nav-layout";
import type { NavGroup, NavLink } from "@/lib/navigation/types";

/** Counts passed from the server layout for notification badges. */
export interface NavBadges {
  notifications?: number;
  messages?: number;
  approvals?: number;
}

interface NavState {
  moreOpen: boolean;
  openGroups: Record<string, boolean>;
}

function storageKeyForRole(primaryRole: string): string {
  // Instructor IA v3: avoid inheriting collapsed accordion state from older nav versions.
  if (primaryRole === "INSTRUCTOR") {
    return `ypp-nav-v3:INSTRUCTOR`;
  }
  return `ypp-nav-v2:${primaryRole}`;
}

function loadSavedState(key: string): NavState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<NavState>;
    return {
      moreOpen: parsed.moreOpen === true,
      openGroups: parsed.openGroups ?? {},
    };
  } catch {
    return null;
  }
}

function saveState(key: string, state: NavState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage full or unavailable.
  }
}

function matchesSearch(item: NavLink, searchLower: string): boolean {
  if (!searchLower) return true;

  const aliasMatch = item.searchAliases?.some((alias) => alias.toLowerCase().includes(searchLower));
  return (
    item.label.toLowerCase().includes(searchLower) ||
    item.href.toLowerCase().includes(searchLower) ||
    aliasMatch === true
  );
}

export default function Nav({
  roles = [],
  primaryRole,
  awardTier,
  badges,
  enabledFeatureKeys,
  onNavigate,
  unlockedSections,
  recentlyUnlockedGroups,
  lockedGroups: lockedGroupsProp,
  studentFullPortalExplorer,
}: {
  roles?: string[];
  primaryRole?: string | null;
  awardTier?: string;
  badges?: NavBadges;
  enabledFeatureKeys?: Set<string>;
  onNavigate?: () => void;
  unlockedSections?: Set<string>;
  recentlyUnlockedGroups?: Set<string>;
  lockedGroups?: Map<string, string>;
  studentFullPortalExplorer?: boolean;
}) {
  const pathname = usePathname();

  // Stable memo inputs — avoid new model / defaultGroupState churn every parent render (was resetting accordions).
  const rolesKey = useMemo(() => [...(roles ?? [])].sort().join("\0"), [roles]);
  const unlockedKey = useMemo(
    () => (unlockedSections?.size ? [...unlockedSections].sort().join("\0") : ""),
    [unlockedSections],
  );
  const featureKeysKey = useMemo(
    () => (enabledFeatureKeys?.size ? [...enabledFeatureKeys].sort().join("\0") : ""),
    [enabledFeatureKeys],
  );

  const model = useMemo(
    () =>
      resolveNavModel({
        roles,
        primaryRole,
        awardTier,
        pathname,
        enabledFeatureKeys,
        unlockedSections,
        studentFullPortalExplorer,
      }),
    [
      awardTier,
      featureKeysKey,
      pathname,
      primaryRole,
      rolesKey,
      studentFullPortalExplorer,
      unlockedKey,
    ],
  );

  // Use locked groups from the model (computed from unlockedSections) or from explicit prop
  const lockedGroups = model.lockedGroups ?? lockedGroupsProp;

  const storageKey = useMemo(() => storageKeyForRole(model.primaryRole), [model.primaryRole]);

  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const searchLower = search.trim().toLowerCase();

  const [moreOpen, setMoreOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  /** When this string changes, the set of nav section titles changed (not just object identity). */
  const navSectionsKey = useMemo(() => model.more.map((g) => g.label).join("\0"), [model.more]);

  function buildDefaultOpenGroups(): Record<string, boolean> {
    const next: Record<string, boolean> = {};
    for (const group of model.more) {
      const hasActive = group.items.some((item) => isNavHrefActive(item.href, pathname));
      if (model.primaryRole === "INSTRUCTOR") {
        next[group.label] = true;
      } else {
        next[group.label] = hasActive;
      }
    }
    return next;
  }

  // Only re-hydrate from disk when role/storage bucket or section structure changes — never on
  // arbitrary model reference churn (fixes accordion taps seemingly doing nothing).
  useEffect(() => {
    const base = buildDefaultOpenGroups();
    const saved = loadSavedState(storageKey);
    if (!saved) {
      setMoreOpen(false);
      setOpenGroups(base);
      return;
    }

    setMoreOpen(saved.moreOpen);
    setOpenGroups({ ...base, ...saved.openGroups });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit pathname/model.more identity; navSectionsKey captures structural changes
  }, [storageKey, navSectionsKey]);

  useEffect(() => {
    setOpenGroups((previous) => {
      const next: Record<string, boolean> = { ...previous };

      for (const group of model.more) {
        if (next[group.label] === undefined) {
          const hasActive = group.items.some((item) => isNavHrefActive(item.href, pathname));
          next[group.label] =
            model.primaryRole === "INSTRUCTOR" ? true : hasActive;
        }
      }

      for (const label of Object.keys(next)) {
        if (!model.more.some((group) => group.label === label)) {
          delete next[label];
        }
      }

      return next;
    });
  }, [model.more, pathname, model.primaryRole]);

  const isFirstPersist = useRef(true);
  useEffect(() => {
    if (isFirstPersist.current) {
      isFirstPersist.current = false;
      return;
    }

    saveState(storageKey, {
      moreOpen,
      openGroups,
    });
  }, [moreOpen, openGroups, storageKey]);

  const toggleGroup = useCallback((groupLabel: string) => {
    setOpenGroups((previous) => ({
      ...previous,
      [groupLabel]: !previous[groupLabel],
    }));
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredCore = useMemo(
    () => model.core.filter((item) => matchesSearch(item, searchLower)),
    [model.core, searchLower],
  );

  const filteredMore = useMemo(
    () =>
      model.more
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => matchesSearch(item, searchLower)),
        }))
        .filter((group) => group.items.length > 0),
    [model.more, searchLower],
  );

  const totalCore = filteredCore.length;
  const totalMore = filteredMore.reduce((sum, group) => sum + group.items.length, 0);
  const totalResults = totalCore + totalMore;

  const showStudentMinimalChrome =
    model.primaryRole === "STUDENT" && studentFullPortalExplorer !== true;
  const showInstructorIaChrome = model.primaryRole === "INSTRUCTOR";
  const studentHomeOnlyCore =
    showStudentMinimalChrome &&
    filteredCore.length === 1 &&
    filteredCore[0]?.href === "/";
  const instructorHomeOnlyCore =
    showInstructorIaChrome && filteredCore.length === 1 && filteredCore[0]?.href === "/";

  const hasSearch = searchLower.length > 0;
  const effectiveMoreOpen = hasSearch ? true : moreOpen;
  const hiddenCount = model.more.reduce((sum, group) => sum + group.items.length, 0);
  const moreCountLabel = hasSearch ? totalMore : hiddenCount;

  const handleNavLinkClick = useCallback(() => {
    if (!onNavigate) return;
    // Close the mobile drawer on the next macrotask so Link/router navigation
    // isn’t dropped when React re-renders the shell in the same pointer event.
    window.setTimeout(() => {
      onNavigate();
    }, 0);
  }, [onNavigate]);

  const renderNavLink = (item: NavLink): JSX.Element => {
    const isActive = isNavHrefActive(item.href, pathname);
    const badgeCount = item.badgeKey && badges ? badges[item.badgeKey] : undefined;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={isActive ? "active" : undefined}
        onClick={onNavigate ? handleNavLinkClick : undefined}
      >
        <span className="nav-icon">{item.icon}</span>
        <span className="nav-item-label">{item.label}</span>
        {badgeCount && badgeCount > 0 ? (
          <span className="nav-badge">{badgeCount > 99 ? "99+" : badgeCount}</span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav className="nav">
      <div className="nav-search-wrapper">
        <input
          ref={searchRef}
          type="text"
          className="nav-search"
          placeholder="Search navigation..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search navigation"
        />
        {!search ? <span className="nav-search-kbd">⌘K</span> : null}
        {search && (
          <button
            type="button"
            className="nav-search-clear"
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            {"✕"}
          </button>
        )}
      </div>

      {totalResults === 0 ? (
        <div className="nav-empty">No results for &ldquo;{search}&rdquo;</div>
      ) : (
        <>
          <section className="nav-main-tools">
            {studentHomeOnlyCore || instructorHomeOnlyCore ? null : (
              <p className="nav-block-title">Top Tools</p>
            )}
            <div className="nav-main-items">{filteredCore.map(renderNavLink)}</div>
          </section>

          {filteredMore.length > 0 ? (
            showStudentMinimalChrome || showInstructorIaChrome ? (
              <section className="nav-student-flat-groups" aria-label="Navigation sections">
                {filteredMore.map((group) => {
                  const groupHasActive = group.items.some((item) => isNavHrefActive(item.href, pathname));
                  const groupOpen = hasSearch
                    ? true
                    : (openGroups[group.label] ?? false) || groupHasActive;
                  const isLocked = lockedGroups?.has(group.label);
                  const lockReason = isLocked && lockedGroups ? lockedGroups.get(group.label) : undefined;
                  const isRecentlyUnlocked = recentlyUnlockedGroups?.has(group.label);
                  const sectionEmoji = showStudentMinimalChrome
                    ? STUDENT_MINIMAL_GROUP_EMOJI[group.label as NavGroup]
                    : showInstructorIaChrome
                      ? INSTRUCTOR_GROUP_EMOJI[group.label as NavGroup]
                      : undefined;
                  const heading = sectionEmoji ? `${sectionEmoji} ${group.label}` : group.label;

                  return (
                    <div key={group.label} className="nav-student-group">
                      <button
                        type="button"
                        className={`nav-more-group-toggle nav-student-flat-toggle ${groupHasActive ? "nav-section-active" : ""}${isLocked ? " nav-section-locked" : ""}`}
                        onClick={() => !isLocked && toggleGroup(group.label)}
                        aria-expanded={isLocked ? false : groupOpen}
                        aria-label={
                          isLocked
                            ? `${group.label} — locked: ${lockReason}`
                            : `${groupOpen ? "Collapse" : "Expand"} ${group.label}`
                        }
                        disabled={hasSearch || isLocked}
                        title={isLocked ? `Locked: ${lockReason}` : undefined}
                      >
                        <span className="nav-section-label">
                          {isLocked && <span className="nav-lock-icon" aria-hidden="true">{"🔒 "}</span>}
                          {heading}
                        </span>
                        {isRecentlyUnlocked ? <span className="nav-new-badge">New!</span> : null}
                        {!isLocked && (
                          <span className={`nav-section-chevron ${groupOpen ? "open" : ""}`}>{"›"}</span>
                        )}
                      </button>

                      {!isLocked && groupOpen ? (
                        <div className="nav-more-group-items">{group.items.map(renderNavLink)}</div>
                      ) : null}
                      {isLocked ? (
                        <p className="nav-student-locked-hint">
                          {lockReason ?? "Complete earlier steps to unlock."}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            ) : (
              <section className="nav-more">
                <button
                  type="button"
                  className="nav-more-toggle"
                  onClick={() => setMoreOpen((previous) => !previous)}
                  aria-expanded={effectiveMoreOpen}
                  aria-label={`${effectiveMoreOpen ? "Collapse" : "Expand"} more navigation links`}
                  disabled={hasSearch}
                >
                  <span className="nav-more-label">More Tools ({moreCountLabel})</span>
                  <span className={`nav-more-chevron ${effectiveMoreOpen ? "open" : ""}`}>{"›"}</span>
                </button>

                {effectiveMoreOpen ? (
                  <div className="nav-more-content">
                    {filteredMore.map((group) => {
                      const groupHasActive = group.items.some((item) => isNavHrefActive(item.href, pathname));
                      const groupOpen = hasSearch
                        ? true
                        : (openGroups[group.label] ?? false) || groupHasActive;

                      const isLocked = lockedGroups?.has(group.label);
                      const lockReason = isLocked && lockedGroups ? lockedGroups.get(group.label) : undefined;
                      const isRecentlyUnlocked = recentlyUnlockedGroups?.has(group.label);

                      return (
                        <div key={group.label} className="nav-more-group">
                          <button
                            type="button"
                            className={`nav-more-group-toggle ${groupHasActive ? "nav-section-active" : ""}${isLocked ? " nav-section-locked" : ""}`}
                            onClick={() => !isLocked && toggleGroup(group.label)}
                            aria-expanded={isLocked ? false : groupOpen}
                            aria-label={`${isLocked ? `${group.label} — locked: ${lockReason}` : `${groupOpen ? "Collapse" : "Expand"} ${group.label}`}`}
                            disabled={hasSearch || isLocked}
                            title={isLocked ? `Locked: ${lockReason}` : undefined}
                          >
                            <span className="nav-section-label">
                              {isLocked && <span className="nav-lock-icon" aria-hidden="true">{"🔒 "}</span>}
                              {group.label}
                            </span>
                            {isRecentlyUnlocked && (
                              <span className="nav-new-badge">New!</span>
                            )}
                            {!isLocked && (
                              <span className={`nav-section-chevron ${groupOpen ? "open" : ""}`}>{"›"}</span>
                            )}
                          </button>

                          {!isLocked && groupOpen ? (
                            <div className="nav-more-group-items">{group.items.map(renderNavLink)}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            )
          ) : null}
        </>
      )}
    </nav>
  );
}
