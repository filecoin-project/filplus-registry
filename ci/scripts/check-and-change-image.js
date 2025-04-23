const { execSync } = require('child_process')

const ECR_REPOSITORY = process.env.ECR_REPOSITORY
const IMAGE_VERSION = process.env.IMAGE_VERSION
const SSM_PARAMETER_NAME = process.env.SSM_PARAMETER_NAME

if (!ECR_REPOSITORY || !IMAGE_VERSION || !SSM_PARAMETER_NAME) {
  console.error(
    'Missing environment variables: ECR_REPOSITORY, IMAGE_VERSION, SSM_PARAMETER_NAME',
  )
  process.exit(1)
}

function runCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf-8' })
    return JSON.parse(output)
  } catch (error) {
    console.error(`Error running command: ${command}`)
    console.error(error.message)
    process.exit(1)
  }
}

console.log('Checking image in ECR...')

const imageExist = runCommand(
  `aws ecr-public describe-images --repository-name ${ECR_REPOSITORY} --region us-east-1  --image-ids imageTag=${IMAGE_VERSION}`,
)

if (!imageExist || !imageExist.imageDetails) {
  console.error(`Image ${IMAGE_VERSION} not found in ECR.`)
  process.exit(1)
}

console.log('Image was found in ECR:', imageExist)

try {
  // const putNewVersion = `aws ssm put-parameter --name "${SSM_PARAMETER_NAME}" --value "${IMAGE_VERSION}" --type String --overwrite`

  // execSync(putNewVersion, { stdio: 'inherit' })
  console.log(`Update version COMPLETE!`)
  console.log(`Trigger the deployment process...`)
} catch (error) {
  console.error(`Failed to put a new version:`, error.message)
}
