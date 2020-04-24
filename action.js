module.exports = function(loader, toggl, timeSlotter, asker, config) {

  this.run = async () => {
    const moment = loader.load('moment')
    const { TimeSlot } = loader.load('timeSlot')

    const start = moment().add(-config.lookBehindDays, 'day')
    const end = moment()

    const lastTimeEntry = await toggl.getLastTimeEntry(start, end)
    var { project, task, description } = await getProjectTaskAndDescriptionFrom(lastTimeEntry, toggl)

    const continueLastActivity = await wantToContinueLastActivity(asker, project, description)

    if (!continueLastActivity) {
      ({ project, task, description } = await chooseProjectTaskAndDescription(toggl, asker))
    }

    const newEntryStart = moment(lastTimeEntry.slot.end)
    const newEntryStop = moment().startOf('minutes')

    const slots = await timeSlotter.slotsIn(new TimeSlot(newEntryStart, newEntryStop))
    toggl.createTimeEntries(project, task, description, slots)
  }

  this.help = () => {
    return "compile from the last recorded activity"
  }
}

async function wantToContinueLastActivity(asker, project, description) {
  const options = ['yes', 'no']
  const response = await asker.list('Continue with the previous activity? ("' + description + '" on project "' + project.description + '")', options)

  return response === 'yes'
}

async function chooseProjectTaskAndDescription (toggl, asker) {
  const clients = await toggl.getClients()
  const projects = await toggl.getActiveProjects()
  const project = await asker.chooseProject(projects, clients)
  const tasks = await toggl.getTasks(project.id)

  const task = tasks.length > 1 ? await asker.chooseTask(tasks) : tasks[0]
  const description = await asker.input('What have you done?')

  return { project, task, description }
}

async function getProjectTaskAndDescriptionFrom (timeEntry, toggl) {
  const project = await toggl.getProject(timeEntry.pid)
  const task = await toggl.getTask(timeEntry.tid)
  const description = timeEntry.description

  return { project, task, description }
}
