/** Add recipients to an organization-scoped, process-local awareness index. */
export function addAwareness(awareness, organization_id, references, recipient) {
    if (organization_id == null || organization_id === '' || recipient == null) return
    let byReference = awareness.get(organization_id)
    if (!byReference) awareness.set(organization_id, byReference = new Map())
    for (const reference of references ?? []) {
        if (typeof reference !== 'string' || !reference) continue
        let recipients = byReference.get(reference)
        if (!recipients) byReference.set(reference, recipients = new Set())
        recipients.add(recipient)
    }
}

/** Return the distinct recipients aware of any reference in one organization. */
export function getAwareness(awareness, organization_id, references) {
    const recipients = new Set()
    const byReference = awareness.get(organization_id)
    for (const reference of references ?? [])
        for (const recipient of byReference?.get(reference) ?? []) recipients.add(recipient)
    return recipients
}

/** Remove one recipient's awareness from an organization and prune empty entries. */
export function removeAwareness(awareness, organization_id, recipient) {
    const byReference = awareness.get(organization_id)
    if (!byReference) return
    for (const [reference, recipients] of byReference) {
        recipients.delete(recipient)
        if (!recipients.size) byReference.delete(reference)
    }
    if (!byReference.size) awareness.delete(organization_id)
}

/** Remove an organization and all recipient awareness stored under it. */
export function clearAwareness(awareness, organization_id) {
    awareness.delete(organization_id)
}
