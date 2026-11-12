/** Add recipients to a process-local distribution map. References never grant access. */
export function addDistribution(distribution, references, recipient) {
    if (recipient === undefined || recipient === null) return
    for (const reference of references ?? []) {
        if (typeof reference !== 'string') continue
        if (!distribution.has(reference)) distribution.set(reference, new Set())
        distribution.get(reference).add(recipient)
    }
}

export function getDistribution(distribution, references) {
    const recipients = new Set()
    for (const reference of references ?? [])
        for (const recipient of distribution?.get(reference) ?? []) recipients.add(recipient)
    return recipients
}
